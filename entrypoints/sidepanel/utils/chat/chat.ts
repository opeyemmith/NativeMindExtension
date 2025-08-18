import { CoreMessage } from 'ai'
import EventEmitter from 'events'
import { type Ref, ref, toRaw, toRef, watch } from 'vue'

import { ContextAttachmentStorage, PDFAttachment } from '@/types/chat'
import { PDFContentForModel } from '@/types/pdf'
import { nonNullable } from '@/utils/array'
import { debounce } from '@/utils/debounce'
import { parseDocument } from '@/utils/document-parser'
import { AbortError, AppError, fromError, GenerateObjectSchemaError, ModelRequestTimeoutError, RateLimitError } from '@/utils/error'
import { useGlobalI18n } from '@/utils/i18n'
import { generateRandomId } from '@/utils/id'
import logger from '@/utils/logger'
import { chatWithPageContent, generateSearchKeywords, nextStep, Page, summarizeWithPageContent } from '@/utils/prompts'
import { UserPrompt } from '@/utils/prompts/helpers'
import { SearchingMessage } from '@/utils/search'
import { ScopeStorage } from '@/utils/storage'
import { type HistoryItemV1 } from '@/utils/tab-store'
import { ActionMessageV1, ActionTypeV1, ActionV1, AssistantMessageV1, ChatHistoryV1, ChatList, pickByRoles, TaskMessageV1, UserMessageV1 } from '@/utils/tab-store/history'
import { getUserConfig } from '@/utils/user-config'

import { generateObjectInBackground, isCurrentModelReady, streamTextInBackground } from '../llm'
// initCurrentModel import removed - no longer needed for cloud providers
import { makeMarkdownIcon, makeParagraph } from '../markdown/content'
import { SearchScraper } from '../search'
import { getCurrentTabInfo, getDocumentContentOfTabs } from '../tabs'

const log = logger.child('chat')

export type MessageIdScope = 'quickActions' | 'welcomeMessage'

export class ReactiveHistoryManager extends EventEmitter {
  constructor(public chatHistory: Ref<ChatHistoryV1>, public systemMessage?: string, private immediateSave?: () => Promise<void>) {
    super()
    this.cleanUp()
  }

  get history() {
    return toRef(this.chatHistory.value, 'history')
  }

  private cleanUp(history: HistoryItemV1[] = this.history.value) {
    const newHistory = history.filter((item) => item.done).map((item) => {
      if (item.role === 'task' && item.subTasks) {
        this.cleanUp(item.subTasks)
      }
      return item
    })
    history.length = 0
    history.push(...newHistory)
  }

  generateId(scope?: MessageIdScope) {
    const randomId = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    return scope ? `${scope}-${randomId}` : randomId
  }

  getMessagesByScope(scope: MessageIdScope) {
    return this.history.value.filter((msg) => msg.id.startsWith(scope))
  }

  isEmpty() {
    return this.history.value.length === 0
  }

  onlyHasDefaultMessages() {
    return this.history.value.every((item) => item.isDefault)
  }

  setSystemMessage(message: string) {
    this.systemMessage = message
  }

  // this method will not change the underlying history, it will just return a new array of messages
  getLLMMessages(extra: { system?: string, user?: UserPrompt, lastUser?: UserPrompt } = {}) {
    const systemMessage = extra.system || this.systemMessage
    const userMessage = extra.user
    const lastUserMessage = extra.lastUser
    const fullHistory = pickByRoles(this.history.value.filter((m) => m.done), ['assistant', 'user', 'system']).map((item) => ({
      role: item.role,
      content: item.content,
    })) as CoreMessage[]
    if (systemMessage) {
      fullHistory.unshift({
        role: 'system',
        content: systemMessage,
      })
    }
    if (userMessage) {
      fullHistory.push({
        role: 'user',
        content: userMessage.content,
      })
    }
    if (lastUserMessage) {
      const lastMsg = fullHistory[fullHistory.length - 1]
      if (lastMsg.role === 'user') {
        lastMsg.content = lastUserMessage.content
      }
      else {
        fullHistory.push({
          role: 'user',
          content: lastUserMessage.content,
        })
      }
    }
    return structuredClone(fullHistory)
  }

  insertMessageAt(msg: HistoryItemV1, index: number) {
    const existingIndex = this.history.value.findIndex((m) => m === msg)
    if (existingIndex > -1) {
      this.history.value.splice(existingIndex, 1)
    }
    if (index < 0) {
      this.history.value.unshift(msg)
    }
    else if (index >= this.history.value.length) {
      this.history.value.push(msg)
    }
    else {
      this.history.value.splice(index, 0, msg)
    }
    if (existingIndex === -1) {
      this.emit('messageAdded', msg)
    }
    return msg
  }

  appendUserMessage(content: string = '') {
    this.history.value.push({
      id: this.generateId(),
      role: 'user',
      content,
      done: true,
      timestamp: Date.now(),
    })
    // Set lastInteractedAt to ensure the message gets saved
    this.chatHistory.value.lastInteractedAt = Date.now()
    const newMsg = this.history.value[this.history.value.length - 1]
    this.emit('messageAdded', newMsg)
    // Immediately save user messages to prevent data loss
    this.immediateSave?.()
    return newMsg as UserMessageV1
  }

  appendAssistantMessage(content: string = '') {
    this.history.value.push({
      id: this.generateId(),
      role: 'assistant',
      content,
      done: false,
      timestamp: Date.now(),
    })
    // Set lastInteractedAt to ensure the message gets saved
    this.chatHistory.value.lastInteractedAt = Date.now()
    const newMsg = this.history.value[this.history.value.length - 1]
    this.emit('messageAdded', newMsg)
    return newMsg as AssistantMessageV1
  }

  appendTaskMessage(content: string = '', parentMessage?: TaskMessageV1) {
    const msg = {
      id: this.generateId(),
      role: 'task',
      content,
      done: false,
      timestamp: Date.now(),
    } satisfies TaskMessageV1
    let newMsg: TaskMessageV1
    if (parentMessage) {
      parentMessage.subTasks = parentMessage.subTasks || []
      parentMessage.subTasks.push(msg)
      newMsg = parentMessage.subTasks[parentMessage.subTasks.length - 1]
    }
    else {
      this.history.value.push(msg)
      newMsg = this.history.value[this.history.value.length - 1] as TaskMessageV1
    }
    // Set lastInteractedAt to ensure the message gets saved
    this.chatHistory.value.lastInteractedAt = Date.now()
    return newMsg as TaskMessageV1
  }

  appendActionMessage(actions: ActionMessageV1['actions'], title?: string) {
    this.history.value.push({
      id: this.generateId(),
      role: 'action',
      actions,
      title,
      timestamp: Date.now(),
      done: true,
    })
    // Set lastInteractedAt to ensure the message gets saved
    this.chatHistory.value.lastInteractedAt = Date.now()
    const newMsg = this.history.value[this.history.value.length - 1]
    this.emit('messageAdded', newMsg)
    return newMsg as ActionMessageV1
  }

  deleteMessage(msg: { id: string }) {
    const idx = this.history.value.findIndex((m) => m.id === msg.id)
    if (idx > -1) {
      const [msg] = this.history.value.splice(idx, 1)
      // Set lastInteractedAt to ensure the deletion gets saved
      this.chatHistory.value.lastInteractedAt = Date.now()
      this.emit('messageRemoved', msg)
      return msg
    }
  }

  onMessageAdded(callback: (msg: HistoryItemV1) => void) {
    this.on('messageAdded', callback)
    return () => {
      this.off('messageAdded', callback)
    }
  }

  onMessageRemoved(callback: (msg: HistoryItemV1) => void) {
    this.on('messageRemoved', callback)
    return () => {
      this.off('messageRemoved', callback)
    }
  }

  onMessageCleared(callback: () => void) {
    this.on('messageCleared', callback)
    return () => {
      this.off('messageCleared', callback)
    }
  }

  clear() {
    const oldHistoryLength = this.history.value.length
    this.history.value.length = 0
    if (oldHistoryLength > 0) {
      this.emit('messageCleared')
    }
  }

  cleanupLoadingMessages() {
    this.cleanUp(this.chatHistory.value.history)
  }
}

type ChatStatus = 'idle' | 'pending' | 'streaming'

const ACTION_EVENT_CONSTRUCT_TYPE = 'messageAction'
export class ActionEvent<ActionType extends ActionTypeV1> extends CustomEvent<{ data: ActionV1[ActionType], action: ActionType }> {
  constructor(public action: ActionType, public data: ActionV1[ActionType]) {
    super(ACTION_EVENT_CONSTRUCT_TYPE, { bubbles: true, detail: { action, data } })
  }
}

export class Chat {
  private static instance: Promise<Chat> | null = null
  private readonly status = ref<ChatStatus>('idle')
  private abortControllers: AbortController[] = []
  private searchScraper = new SearchScraper()
  private static chatStorage = new ScopeStorage<{ timestamp: number, title: string }>('chat')

  static getInstance() {
    if (!this.instance) {
      this.instance = (async () => {
        const userConfig = await getUserConfig()
        const chatHistoryId = userConfig.chat.history.currentChatId.toRef()
        const chatHistory = ref<ChatHistoryV1>(await this.chatStorage.getItem<ChatHistoryV1>(`${chatHistoryId.value}`, 'chat') ?? { history: [], id: chatHistoryId.value, title: 'New Chat' })
        const contextAttachments = ref<ContextAttachmentStorage>(await this.chatStorage.getItem<ContextAttachmentStorage>(`${chatHistoryId.value}`, 'context-attachments') ?? { attachments: [], id: chatHistoryId.value })
        const chatList = ref<ChatList>([])
        const updateChatList = async () => {
          const chatMeta = await this.chatStorage.getAllMetadata()
          chatList.value = chatMeta
            ? Object.entries(chatMeta)
                .map(([id, meta]) => ({ id, title: meta.metadata.title, timestamp: meta.metadata.timestamp }))
                .toSorted((a, b) => b.timestamp - a.timestamp)
            : []
        }
        const debounceSaveHistory = debounce(async () => {
          if (!chatHistory.value.lastInteractedAt) return
          await this.chatStorage.setItem(`${chatHistory.value.id}`, { chat: toRaw(chatHistory.value) }, { timestamp: Date.now(), title: chatHistory.value.title })
        }, 300)
        const debounceSaveContextAttachment = debounce(async () => {
          if (!contextAttachments.value.lastInteractedAt) return
          await this.chatStorage.setItem(`${contextAttachments.value.id}`, { 'context-attachments': toRaw(contextAttachments.value) }, { timestamp: Date.now(), title: '' })
        }, 1000)
        watch(chatHistoryId, async (newId) => {
          instance.stop()
          Object.assign(chatHistory.value, await this.chatStorage.getItem<ChatHistoryV1>(`${newId}`, 'chat') ?? { history: [], id: newId })
          Object.assign(contextAttachments.value, await this.chatStorage.getItem<ContextAttachmentStorage>(`${newId}`, 'context-attachments') ?? { attachments: [], id: newId })
          instance.historyManager.cleanupLoadingMessages()
        })
        watch(chatHistory, async () => debounceSaveHistory(), { deep: true })
        watch(contextAttachments, async () => debounceSaveContextAttachment(), { deep: true })
        updateChatList()
        this.chatStorage.onMetaChange(async () => await updateChatList())
        // Create immediate save function for critical operations
        const immediateSave = async () => {
          if (chatHistory.value.lastInteractedAt) {
            await this.chatStorage.setItem(`${chatHistory.value.id}`, { chat: toRaw(chatHistory.value) }, { timestamp: Date.now(), title: chatHistory.value.title })
          }
        }
        const instance = new this(new ReactiveHistoryManager(chatHistory, undefined, immediateSave), contextAttachments, chatList)
        return instance
      })()
    }
    return this.instance
  }

  static createActionEventDispatcher<ActionType extends ActionTypeV1>(action: ActionType) {
    return function actionEvent(data: ActionV1[ActionType], el?: HTMLElement | EventTarget | null) {
      log.debug('Creating action event', action, data)
      ;(el ?? window).dispatchEvent(new ActionEvent<ActionType>(action, data))
    }
  }

  static createActionEventHandler(handler: (ev: ActionEvent<ActionTypeV1>) => void) {
    return function actionHandler(ev: Event) {
      if (ev.type === ACTION_EVENT_CONSTRUCT_TYPE && ev instanceof CustomEvent) {
        log.debug('Action event triggered', ev)
        // reconstruct the event to fix firefox issue
        // firefox does not pass the origin event instance in the event bubbling
        const event = ev as CustomEvent<{ action: ActionTypeV1, data: ActionV1[ActionTypeV1] }>
        const actionEvent = new ActionEvent<ActionTypeV1>(event.detail.action, event.detail.data)
        handler(actionEvent)
      }
    }
  }

  constructor(public historyManager: ReactiveHistoryManager, public contextAttachmentStorage: Ref<ContextAttachmentStorage>, public chatList: Ref<ChatList>) { }

  get contextAttachments() {
    return toRef(this.contextAttachmentStorage.value, 'attachments')
  }

  get contextTabs() {
    const contextTabs = this.contextAttachments.value.filter((attachment) => attachment.type === 'tab').map((attachment) => attachment.value)
    const currentTab = this.contextAttachmentStorage.value.currentTab?.type === 'tab' ? this.contextAttachmentStorage.value.currentTab.value : undefined
    const filteredContextTabs = contextTabs.filter((tab) => tab.id !== currentTab?.id)
    return [currentTab, ...filteredContextTabs].filter(nonNullable)
  }

  get contextImages() {
    return this.contextAttachments.value.filter((attachment) => attachment.type === 'image').map((attachment) => attachment.value)
  }

  get contextPDFs() {
    const currentTab = this.contextAttachmentStorage.value.currentTab?.type === 'pdf' ? this.contextAttachmentStorage.value.currentTab.value : undefined
    return [currentTab, ...this.contextAttachments.value.filter((attachment) => attachment.type === 'pdf').map((attachment) => attachment.value)].filter(nonNullable)
  }

  isAnswering() {
    return this.status.value === 'pending' || this.status.value === 'streaming'
  }

  private async errorHandler(e: unknown, msg?: AssistantMessageV1) {
    log.error('Error in chat', e)
    if (!(e instanceof AbortError)) {
      const errorMsg = msg || this.historyManager.appendAssistantMessage()
      errorMsg.isError = true
      errorMsg.done = true
      errorMsg.content = e instanceof AppError ? await e.toLocaleMessage() : '😅 Something unexpected happened. Please try again!'
    }
    else if (msg) {
      this.historyManager.deleteMessage(msg)
    }
  }

  statusScope(status: Exclude<ChatStatus, 'idle'>) {
    log.debug('statusScope', status)
    this.status.value = status
    return {
      [Symbol.dispose]: () => {
        this.status.value = 'idle'
        log.debug('statusScope dispose', this.status.value)
      },
    }
  }

  async resetContextTabs() {
    const currentTabInfo = await getCurrentTabInfo()
    this.contextAttachments.value = this.contextAttachments.value.filter((attachment) => attachment.type !== 'tab')
    this.contextAttachments.value.unshift({ type: 'tab', value: { ...currentTabInfo, id: generateRandomId() } })
  }

  async checkNextStep(contextMsgs: { role: 'user' | 'assistant', content: string }[]) {
    log.debug('checkNextStep', contextMsgs)
    const relevantTabIds = this.contextTabs.map((tab) => tab.tabId)
    const relevantPDF = this.contextPDFs?.[0] ? await this.extractPDFContent(this.contextPDFs[0]) : undefined
    if (this.contextPDFs.length > 1) log.warn('Multiple PDFs are attached, only the first one will be used for the chat context.')
    const pages = await getDocumentContentOfTabs(relevantTabIds)
    const abortController = this.createAbortController()
    const prompt = await nextStep(contextMsgs, pages.filter(nonNullable), relevantPDF)
    const next = await generateObjectInBackground({
      schema: 'nextStep',
      prompt: prompt.user.extractText(),
      system: prompt.system,
      abortSignal: abortController.signal,
      timeout: 180_000, // 3 minutes for nextStep decisions (longer timeout)
    }).then((r) => r.object).catch((e) => {
      log.error('Error in nextStep', e)
      // Handle rate limit and timeout errors more gracefully
      if (fromError(e) instanceof GenerateObjectSchemaError) return { action: 'chat' as const }
      if (fromError(e) instanceof ModelRequestTimeoutError) {
        log.warn('NextStep decision timed out, defaulting to chat')
        return { action: 'chat' as const }
      }
      if (fromError(e) instanceof RateLimitError) {
        log.warn('NextStep hit rate limit, defaulting to chat')
        return { action: 'chat' as const }
      }
      if (e instanceof Error && e.message.includes('Rate limit')) {
        log.warn('NextStep hit rate limit, defaulting to chat')
        return { action: 'chat' as const }
      }
      throw e
    })
    log.debug('nextStep', next)
    return next
  }

  private createAbortController() {
    const abortController = new AbortController()
    this.abortControllers.push(abortController)
    return abortController
  }

  private async prepareModel() {
    // Cloud providers like OpenRouter are always ready - no local model loading needed
    const isReady = await isCurrentModelReady()
    if (!isReady) {
      throw new Error('Model not configured or API key missing')
    }
  }

  private async searchOnline(queryList: string[], { onStartQuery, resultLimit }: { onStartQuery?: (query: string) => void, resultLimit?: number } = {}) {
    const { t } = await useGlobalI18n()
    const abortController = new AbortController()
    this.abortControllers.push(abortController)
    const searcher = this.searchScraper.search(queryList, { abortSignal: abortController.signal, resultLimit, engine: 'google' })
    let linksResult: undefined | (SearchingMessage & { type: 'links' })['links'] = undefined
    const msgs = {} as Record<string, TaskMessageV1>
    const makeShortTitleLink = (title: string, url: string) => {
      return `[${title}](${url})`
    }
    let parentTaskMsg: TaskMessageV1 | undefined
    for await (const progress of searcher) {
      if (progress.type === 'query-start') {
        onStartQuery?.(progress.query)
        parentTaskMsg = this.historyManager.appendTaskMessage(t('chat.messages.search_locally'))
        parentTaskMsg.icon = 'searchColored'
      }
      else if (progress.type === 'query-finished') {
        if (parentTaskMsg) {
          parentTaskMsg.content = `Finished searching`
          parentTaskMsg.done = true
        }
      }
      else if (progress.type === 'page-start') {
        const msg = this.historyManager.appendTaskMessage(makeParagraph(`${t('chat.messages.reading')}: "${makeShortTitleLink(progress.title, progress.url)}"`, { rows: 1 }), parentTaskMsg)
        msg.icon = 'tickColored'
        if (msgs[progress.url]) {
          msgs[progress.url].done = true
        }
        msgs[progress.url] = msg
      }
      else if (progress.type === 'page-finished') {
        if (msgs[progress.url]) {
          msgs[progress.url].content = makeParagraph(`${t('chat.messages.reading')}: "${makeShortTitleLink(progress.title, progress.url)}"`, { rows: 1 })
          msgs[progress.url].done = true
        }
      }
      else if (progress.type === 'page-error') {
        if (msgs[progress.url]) {
          const idx = parentTaskMsg?.subTasks?.findIndex((subTask) => subTask.id === msgs[progress.url].id)
          if (idx !== undefined && idx > -1) {
            parentTaskMsg?.subTasks?.splice(idx, 1)
          }
        }
      }
      else if (progress.type === 'links') {
        linksResult = progress.links
      }
      else if (progress.type === 'need-interaction') {
        this.historyManager.appendAssistantMessage(`Need interaction: [${progress.currentUrl}](${progress.currentUrl})`)
      }
    }
    Object.values(msgs).forEach((msg) => {
      msg.done = true
    })
    parentTaskMsg && (parentTaskMsg.done = true)
    log.debug('[Search Engine] result', linksResult)
    return linksResult
  }

  private async questionToKeywords(contextMsgs: { role: 'user' | 'assistant', content: string }[]) {
    const abortController = this.createAbortController()
    const relevantTabIds = this.contextTabs.map((tab) => tab.tabId)
    const pages = await getDocumentContentOfTabs(relevantTabIds)
    const prompt = await generateSearchKeywords(contextMsgs, pages.filter(nonNullable))
    const r = await generateObjectInBackground({
      schema: 'searchKeywords',
      system: prompt.system,
      prompt: prompt.user.extractText(),
      abortSignal: abortController.signal,
      timeout: 90_000, // 90 seconds for keyword generation
    }).catch((e) => {
      log.error('Error generating search keywords', e)
      // Fallback to using the last user message as keywords if generation fails
      const lastUserMsg = contextMsgs.filter(msg => msg.role === 'user').pop()?.content || ''
      return { object: { queryKeywords: [lastUserMsg.slice(0, 100)] } }
    })
    return r.object.queryKeywords
  }

  async summarizeCurrentPage(hint: string) {
    const userPrompt = hint
    const display = hint

    using _s = this.statusScope('pending')
    const article = await parseDocument(document)
    const prompt = await summarizeWithPageContent({ ...article, url: location.href }, userPrompt)
    this.historyManager.appendUserMessage(display)
    await this.prepareModel()
    return await this.sendMessage(prompt.user, prompt.system, { autoDeleteEmptyResponseMsg: false })
  }

  private async extractPDFContent(pdfData: PDFAttachment['value']): Promise<PDFContentForModel> {
    return {
      type: 'text',
      textContent: pdfData.textContent,
      pageCount: pdfData.pageCount,
      fileName: pdfData.name,
    }
  }

  async ask(question: string) {
    using _s = this.statusScope('pending')
    const userConfig = await getUserConfig()
    const abortController = new AbortController()
    this.abortControllers.push(abortController)

    question && this.historyManager.appendUserMessage(question)
    await this.prepareModel()
    const nextStepContext = pickByRoles(this.historyManager.history.value, ['user', 'assistant']).slice(-4)
    let loading: AssistantMessageV1 | undefined = this.historyManager.appendAssistantMessage()
    const enableOnlineSearch = userConfig.chat.onlineSearch.enable.get()
    let onlineResults: undefined | Page[]
    let next: Awaited<ReturnType<typeof this.checkNextStep>> = { action: 'chat' }
    let searchKeywords: string[] = []
    if (enableOnlineSearch === 'force') {
      searchKeywords = await this.questionToKeywords(nextStepContext).catch((e) => {
        log.error('Error in questionToKeywords, using fallback', e)
        // Fallback to using the last user message as keywords
        const lastUserMsg = nextStepContext.filter(msg => msg.role === 'user').pop()?.content || ''
        return [lastUserMsg.slice(0, 100)]
      })
    }
    else if (enableOnlineSearch === 'auto') {
      next = await this.checkNextStep(nextStepContext).catch(async (e) => {
        log.error('Error in checkNextStep, defaulting to chat mode', e)
        // Don't show error to user for checkNextStep failures, just default to chat
        return { action: 'chat' as const }
      })
      if (next.action === 'search_online') {
        searchKeywords = next.queryKeywords
      }
    }
    if (searchKeywords?.length) {
      log.debug('[Search Engine] keywords', searchKeywords)
      onlineResults = await this.searchOnline(searchKeywords, { onStartQuery: () => loading && this.historyManager.deleteMessage(loading), resultLimit: userConfig.chat.onlineSearch.pageReadCount.get() })
      loading = undefined
    }
    const relevantTabIds = this.contextTabs.map((tab) => tab.tabId)
    const relevantImages = this.contextImages
    const relevantPDF = this.contextPDFs?.[0] ? await this.extractPDFContent(this.contextPDFs[0]) : undefined
    if (this.contextPDFs.length > 1) log.warn('Multiple PDFs are attached, only the first one will be used for the chat context.')
    const pages = await getDocumentContentOfTabs(relevantTabIds)
    const prompt = await chatWithPageContent(question, pages.filter(nonNullable), onlineResults, relevantImages, relevantPDF)
    await this.sendMessage(prompt.user, prompt.system, { assistantMsg: loading })
  }

  private async sendMessage(user: UserPrompt, system?: string, options: { autoDeleteEmptyResponseMsg?: boolean, assistantMsg?: AssistantMessageV1 } = {}) {
    const abortController = new AbortController()
    this.abortControllers.push(abortController)
    const autoDeleteEmptyMsg = options.autoDeleteEmptyResponseMsg ?? true

    this.historyManager.chatHistory.value.lastInteractedAt = Date.now()
    const messages = this.historyManager.getLLMMessages({ system, lastUser: user })
    const response = streamTextInBackground({
      abortSignal: abortController.signal,
      messages,
    })
    const msg = options.assistantMsg ?? this.historyManager.appendAssistantMessage()
    let reasoningStart: number | undefined
    using _s1 = this.statusScope('streaming')
    try {
      for await (const chunk of response) {
        if (abortController.signal.aborted) {
          msg.done = true
          this.status.value = 'idle'
          return
        }
        if (chunk.type === 'text-delta') {
          msg.content += chunk.textDelta
        }
        else if (chunk.type === 'reasoning') {
          reasoningStart = reasoningStart || Date.now()
          msg.reasoningTime = reasoningStart ? Date.now() - reasoningStart : undefined
          msg.reasoning = (msg.reasoning || '') + chunk.textDelta
        }
        else if (chunk.type === 'error') {
          throw chunk.error
        }
      }
      if ((!msg.content && !msg.reasoning) && autoDeleteEmptyMsg) {
        const index = this.historyManager.history.value.indexOf(msg)
        if (index > -1) {
          this.historyManager.history.value.splice(index, 1)
          return false
        }
      }
      return msg
    }
    catch (e) {
      logger.error('Error in chat stream', e)
      msg.isError = true
      msg.content = e instanceof AppError ? await e.toLocaleMessage() : '😅 Something unexpected happened. Please try again!'
    }
    finally {
      msg.done = true
      this.status.value = 'idle'
    }
    return false
  }

  stop() {
    this.abortControllers.forEach((abortController) => {
      abortController.abort()
    })
    this.abortControllers.length = 0
  }
}

if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).__NATIVEMIND_GET_CHAT_INSTANCE = () => Chat.getInstance()
}
