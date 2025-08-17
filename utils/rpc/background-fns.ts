import { safeParseJSON } from '@ai-sdk/provider-utils'
import { generateObject as originalGenerateObject, GenerateObjectResult, generateText as originalGenerateText, streamObject as originalStreamObject, streamText as originalStreamText } from 'ai'
import { EventEmitter } from 'events'
import { Browser, browser } from 'wxt/browser'
import { z } from 'zod'
import { convertJsonSchemaToZod, JSONSchema } from 'zod-from-json-schema'

import { TabInfo } from '@/types/tab'
import logger from '@/utils/logger'

import { sleep } from '../async'
import { MODELS_NOT_SUPPORTED_FOR_STRUCTURED_OUTPUT } from '../constants'
import { ContextMenuManager } from '../context-menu'
import { AppError, CreateTabStreamCaptureError, FetchError, GenerateObjectSchemaError, ModelRequestError, UnknownError } from '../error'
import { getModel, getModelUserConfig, ModelLoadingProgressEvent } from '../llm/models'
import { deleteModel, getLocalModelList as getOllamaLocalModelList, getRunningModelList, pullModel, showModelDetails, unloadModel } from '../llm/ollama'
import {
  clearOpenRouterModelsCache,
  getOpenRouterModelsWithCache,
  OpenRouterModel,
  POPULAR_OPENROUTER_MODELS,
} from '../llm/openrouter-models'
import { SchemaName, Schemas, selectSchema } from '../llm/output-schema'
import { PREDEFINED_OPENROUTER_MODELS } from '../llm/predefined-models'
import { selectTools, ToolName, ToolWithName } from '../llm/tools'
import { getWebLLMEngine, WebLLMSupportedModel } from '../llm/web-llm'
import { parsePdfFileOfUrl } from '../pdf'
import { searchOnline } from '../search'
import { showSettingsForBackground } from '../settings'
import { getUserConfig } from '../user-config'
import { b2sRpc, bgBroadcastRpc } from '.'
import { preparePortConnection } from './utils'

type StreamTextOptions = Omit<Parameters<typeof originalStreamText>[0], 'tools'>
type GenerateTextOptions = Omit<Parameters<typeof originalGenerateText>[0], 'tools'>
type GenerateObjectOptions = Omit<Parameters<typeof originalGenerateObject>[0], 'tools'>
type ExtraGenerateOptions = { modelId?: string, reasoning?: boolean }
type ExtraGenerateOptionsWithTools = ExtraGenerateOptions & { tools?: (ToolName | ToolWithName)[] }
type SchemaOptions<S extends SchemaName> = { schema: S } | { jsonSchema: JSONSchema }

const parseSchema = <S extends SchemaName>(options: SchemaOptions<S>) => {
  if ('schema' in options) {
    return selectSchema(options.schema)
  }
  else if (options.jsonSchema) {
    return convertJsonSchemaToZod(options.jsonSchema)
  }
  throw new Error('Schema not provided')
}

const generateExtraModelOptions = (options: ExtraGenerateOptions) => {
  return {
    ...(options.modelId !== undefined ? { model: options.modelId } : {}),
    ...(options.reasoning !== undefined ? { reasoningEffort: options.reasoning } : {}),
  }
}

const makeLoadingModelListener = (port: Browser.runtime.Port) => (ev: ModelLoadingProgressEvent) => {
  port.postMessage({
    type: 'loading-model',
    progress: ev,
  })
}

const normalizeError = (_error: unknown) => {
  let error
  if (_error instanceof AppError) {
    error = _error
  }
  else if (_error instanceof Error && _error.message.includes('Failed to fetch')) {
    error = new ModelRequestError(_error.message)
  }
  else {
    error = new UnknownError(`Unexpected error occurred during request: ${_error}`)
  }
  return error
}

const streamText = async (options: Pick<StreamTextOptions, 'messages' | 'prompt' | 'system' | 'toolChoice' | 'maxTokens' | 'topK' | 'topP'> & ExtraGenerateOptionsWithTools) => {
  const abortController = new AbortController()
  const portName = `streamText-${Date.now().toString(32)}`
  const onStart = async (port: Browser.runtime.Port) => {
    if (port.name !== portName) {
      return
    }
    browser.runtime.onConnect.removeListener(onStart)
    port.onDisconnect.addListener(() => {
      logger.debug('port disconnected from client')
      abortController.abort()
    })
    const response = originalStreamText({
      model: await getModel({ ...(await getModelUserConfig()), onLoadingModel: makeLoadingModelListener(port), ...generateExtraModelOptions(options) }),
      messages: options.messages,
      prompt: options.prompt,
      system: options.system,
      tools: options.tools?.length ? selectTools(...options.tools) : undefined,
      toolChoice: options.toolChoice,
      maxTokens: options.maxTokens,
      abortSignal: abortController.signal,
    })
    for await (const chunk of response.fullStream) {
      if (chunk.type === 'error') {
        logger.error(chunk.error)
        port.postMessage({ type: 'error', error: normalizeError(chunk.error) })
      }
      else {
        port.postMessage(chunk)
      }
    }
    port.disconnect()
  }
  preparePortConnection(portName).then(onStart)
  return { portName }
}

const generateTextAsync = async (options: Pick<GenerateTextOptions, 'messages' | 'prompt' | 'system' | 'toolChoice' | 'maxTokens'> & ExtraGenerateOptionsWithTools) => {
  const response = originalGenerateText({
    model: await getModel({ ...(await getModelUserConfig()), ...generateExtraModelOptions(options) }),
    messages: options.messages,
    prompt: options.prompt,
    system: options.system,
    tools: options.tools?.length ? selectTools(...options.tools) : undefined,
    toolChoice: options.toolChoice,
    maxTokens: options.maxTokens,
  })
  return response
}

const generateText = async (options: Pick<GenerateTextOptions, 'messages' | 'prompt' | 'system' | 'toolChoice' | 'maxTokens' | 'temperature' | 'topK' | 'topP'> & ExtraGenerateOptionsWithTools) => {
  const abortController = new AbortController()
  const portName = `streamText-${Date.now().toString(32)}`
  const onStart = async (port: Browser.runtime.Port) => {
    if (port.name !== portName) {
      return
    }
    browser.runtime.onConnect.removeListener(onStart)
    port.onDisconnect.addListener(() => {
      logger.debug('port disconnected from client')
      abortController.abort()
    })
    const response = await originalGenerateText({
      model: await getModel({ ...(await getModelUserConfig()), ...generateExtraModelOptions(options) }),
      messages: options.messages,
      prompt: options.prompt,
      system: options.system,
      tools: options.tools?.length ? selectTools(...options.tools) : undefined,
      temperature: options.temperature,
      topK: options.topK,
      topP: options.topP,
      toolChoice: options.toolChoice,
      maxTokens: options.maxTokens,
      abortSignal: abortController.signal,
    })
    logger.debug('generateText response', response)
    port.postMessage(response)
    port.disconnect()
  }
  preparePortConnection(portName).then(onStart)
  return { portName }
}

const streamObjectFromSchema = async <S extends SchemaName>(options: Pick<GenerateObjectOptions, 'prompt' | 'system' | 'messages'> & SchemaOptions<S> & ExtraGenerateOptions) => {
  const abortController = new AbortController()
  const portName = `streamText-${Date.now().toString(32)}`
  const onStart = async (port: Browser.runtime.Port) => {
    if (port.name !== portName) {
      return
    }
    browser.runtime.onConnect.removeListener(onStart)
    port.onDisconnect.addListener(() => {
      logger.debug('port disconnected from client')
      abortController.abort()
    })
    const response = originalStreamObject({
      model: await getModel({ ...(await getModelUserConfig()), onLoadingModel: makeLoadingModelListener(port), ...generateExtraModelOptions(options) }),
      output: 'object',
      schema: parseSchema(options),
      prompt: options.prompt,
      system: options.system,
      messages: options.messages,
      abortSignal: abortController.signal,
    })
    for await (const chunk of response.fullStream) {
      if (chunk.type === 'error') {
        logger.error(chunk.error)
      }
      port.postMessage(chunk)
    }
    port.disconnect()
  }
  preparePortConnection(portName).then(onStart)
  return { portName }
}

const generateObjectFromSchema = async <S extends SchemaName>(options: Pick<GenerateObjectOptions, 'prompt' | 'system' | 'messages'> & SchemaOptions<S> & ExtraGenerateOptions) => {
  const s = parseSchema(options)
  const isEnum = s instanceof z.ZodEnum
  let ret
  const modelInfo = { ...(await getModelUserConfig()), ...generateExtraModelOptions(options) }
  try {
    if (MODELS_NOT_SUPPORTED_FOR_STRUCTURED_OUTPUT.some((pattern) => pattern.test(modelInfo.model))) {
      const response = await originalGenerateText({
        model: await getModel(modelInfo),
        prompt: options.prompt,
        system: options.system,
        messages: options.messages,
      })
      const parsed = safeParseJSON<z.infer<Schemas[S]>>({ text: response.text, schema: s })
      if (!parsed.success) {
        logger.error('Failed to parse response with schema', s, 'response:', response)
        throw new GenerateObjectSchemaError(`Response does not match schema: ${parsed.error.message}`)
      }
      const result: GenerateObjectResult<z.infer<Schemas[S]>> = {
        ...response,
        object: parsed.value,
        toJsonResponse: () => new Response(JSON.stringify(response.text), {
          headers: { 'Content-Type': 'application/json' },
        }),
      }
      return result
    }
    if (isEnum) {
      ret = await originalGenerateObject({
        model: await getModel(modelInfo),
        output: 'enum',
        enum: (s as z.ZodEnum<[string, ...string[]]>)._def.values,
        prompt: options.prompt,
        system: options.system,
        messages: options.messages,
      })
    }
    else {
      ret = await originalGenerateObject({
        model: await getModel(modelInfo),
        output: 'object',
        schema: s as z.ZodSchema,
        prompt: options.prompt,
        system: options.system,
        messages: options.messages,
      })
    }
  }
  catch (error) {
    logger.error('Error generating object from schema:', error)
    throw normalizeError(error)
  }
  return ret as GenerateObjectResult<z.infer<Schemas[S]>>
}

const getAllTabs = async () => {
  const tabs = await browser.tabs.query({})
  return tabs.map((tab) => ({
    tabId: tab.id,
    title: tab.title,
    faviconUrl: tab.favIconUrl,
    url: tab.url,
  }))
}

const getDocumentContentOfTab = async (tabId?: number) => {
  if (!tabId) {
    const currentTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0]
    tabId = currentTab.id
  }
  if (!tabId) throw new Error('No tab id provided')
  const article = await bgBroadcastRpc.getDocumentContent({ _toTab: tabId })
  return article
}

const getPagePDFContent = async (tabId: number) => {
  if (import.meta.env.FIREFOX) {
    const tabUrl = await browser.tabs.get(tabId).then((tab) => tab.url)
    if (tabUrl) return parsePdfFileOfUrl(tabUrl)
  }
  return await bgBroadcastRpc.getPagePDFContent({ _toTab: tabId })
}

const getPageContentType = async (tabId: number) => {
  const contentType = await browser.scripting.executeScript({
    target: { tabId },
    func: () => document.contentType,
  }).then((result) => {
    return result[0]?.result
  }).catch(async (error) => {
    logger.error('Failed to get page content type', error)
    const tabUrl = await browser.tabs.get(tabId).then((tab) => tab.url)
    if (tabUrl) {
      const response = await fetch(tabUrl, { method: 'HEAD' })
      return response.headers.get('content-type')?.split(';')[0]
    }
  }).catch((error) => {
    logger.error('Failed to get page content type from HEAD request', error)
  })
  return contentType ?? 'text/html'
}

const fetchAsDataUrl = async (url: string, initOptions?: RequestInit) => {
  const response = await fetch(url, initOptions)
  if (!response.ok) {
    throw new FetchError(`Failed to fetch ${url}: ${response.statusText}`)
  }

  const blob = await response.blob()
  return new Promise<{ status: number, dataUrl: string }>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64Data = reader.result as string
      resolve({
        status: response.status,
        dataUrl: base64Data,
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const fetchAsText = async (url: string, initOptions?: RequestInit) => {
  try {
    const response = await fetch(url, initOptions)
    if (!response.ok) {
      return {
        status: response.status,
        error: `Failed to fetch ${url}: ${response.statusText}`,
      }
    }

    const text = await response.text()
    return {
      status: response.status,
      text,
    }
  }
  catch (error) {
    return {
      status: 500,
      error: `Failed to fetch ${url}: ${error}`,
    }
  }
}

const deleteOllamaModel = async (modelId: string) => {
  await deleteModel(modelId)
}

const unloadOllamaModel = async (modelId: string) => {
  await unloadModel(modelId)
  const start = Date.now()
  while (Date.now() - start < 10000) {
    const modelList = await getRunningModelList()
    if (!modelList.models.some((m) => m.model === modelId)) {
      break
    }
    await sleep(1000)
  }
}

const showOllamaModelDetails = async (modelId: string) => {
  return showModelDetails(modelId)
}

const pullOllamaModel = async (modelId: string) => {
  const abortController = new AbortController()
  const portName = `streamText-${Date.now().toString(32)}`
  const onStart = async (port: Browser.runtime.Port) => {
    if (port.name !== portName) {
      return
    }
    browser.runtime.onConnect.removeListener(onStart)
    port.onDisconnect.addListener(() => {
      logger.debug('port disconnected from client')
      abortController.abort()
    })
    const response = await pullModel(modelId)
    abortController.signal.addEventListener('abort', () => {
      response.abort()
    })
    try {
      for await (const chunk of response) {
        if (abortController.signal.aborted) {
          response.abort()
          break
        }
        port.postMessage(chunk)
      }
    }
    catch (error: unknown) {
      logger.debug('[pullOllamaModel] error', error)
      if (error instanceof Error) {
        port.postMessage({ error: error.message })
      }
      else {
        port.postMessage({ error: 'Unknown error' })
      }
    }
    port.disconnect()
  }
  browser.runtime.onConnect.addListener(onStart)
  setTimeout(() => {
    browser.runtime.onConnect.removeListener(onStart)
  }, 20000)
  return { portName }
}

async function testOllamaConnection() {
  const userConfig = await getUserConfig()
  const endpointType = userConfig.llm.endpointType.get()

  if (endpointType === 'openrouter') {
    try {
      const apiKey = userConfig.llm.apiKey.get()
      const baseUrl = userConfig.llm.baseUrl.get()

      if (!apiKey) {
        logger.error('OpenRouter API key not configured')
        return false
      }

      // Test OpenRouter connection by making a simple API call
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        logger.error('OpenRouter API test failed:', response.status, response.statusText)
        return false
      }

      return true
    }
    catch (error: unknown) {
      logger.error('error connecting to openrouter api', error)
      return false
    }
  }
  else if (endpointType === 'ollama') {
    try {
      const baseUrl = userConfig.llm.baseUrl.get()
      const origin = new URL(baseUrl).origin
      const response = await fetch(origin)
      if (!response.ok) return false
      const text = await response.text()
      if (text.includes('Ollama is running')) return true
      else return false
    }
    catch (error: unknown) {
      logger.error('error connecting to ollama api', error)
      return false
    }
  }
  else {
    // For web-llm, always return true as it doesn't need external connection
    return true
  }
}

function initWebLLMEngine(model: WebLLMSupportedModel) {
  try {
    const portName = `web-llm-${model}-${Date.now().toString(32)}`
    preparePortConnection(portName).then(async (port) => {
      port.onDisconnect.addListener(() => {
        logger.debug('port disconnected from client')
      })
      await getWebLLMEngine({
        model,
        contextWindowSize: 8192,
        onInitProgress: (progress) => {
          port.postMessage({ type: 'progress', progress })
        },
      })
      port.postMessage({ type: 'ready' })
    })
    return { portName }
  }
  catch (error) {
    logger.error('Error initializing WebLLM engine:', error)
    throw error
  }
}

type UnsupportedWebLLMReason = 'browser' | 'not_support_webgpu' | 'not_support_high_performance'
async function checkSupportWebLLM(): Promise<{ supported: boolean, reason?: UnsupportedWebLLMReason }> {
  if (import.meta.env.FIREFOX) {
    return {
      supported: false,
      reason: 'browser',
    }
  }
  if (!navigator.gpu) {
    return {
      supported: false,
      reason: 'not_support_webgpu',
    }
  }
  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    })
    const device = await adapter?.requestDevice()
    device?.destroy()
    return {
      supported: true,
    }
  }
  catch (error) {
    logger.debug('WebGPU not supported', error)
    return {
      supported: false,
      reason: 'not_support_high_performance',
    }
  }
}

async function getSystemMemoryInfo() {
  if (import.meta.env.FIREFOX) throw new Error('system.memory API is not supported in Firefox')
  return browser.system.memory.getInfo()
}

async function hasWebLLMModelInCache(model: WebLLMSupportedModel) {
  const { hasModelInCache } = await import('@mlc-ai/web-llm')
  const hasCache = await hasModelInCache(model)
  logger.debug('Checking cache for model', model, hasCache)
  return hasCache
}

async function deleteWebLLMModelInCache(model: WebLLMSupportedModel) {
  const { deleteModelInCache, hasModelInCache } = await import('@mlc-ai/web-llm')
  const hasCache = await hasModelInCache(model)
  logger.debug(`Deleting model ${model} from cache`, hasCache)
  try {
    await deleteModelInCache(model)
  }
  catch (error) {
    logger.error(`Failed to delete model ${model} from cache:`, error)
  }
}

async function checkModelReady(modelId: string) {
  try {
    const userConfig = await getUserConfig()
    const endpointType = userConfig.llm.endpointType.get()
    if (endpointType === 'ollama') return true
    else if (endpointType === 'openrouter') return true
    else if (endpointType === 'web-llm') {
      return await hasWebLLMModelInCache(modelId as WebLLMSupportedModel)
    }
    else throw new Error('Unsupported endpoint type ' + endpointType)
  }
  catch (error) {
    logger.error('Error checking current model readiness:', error)
    return false
  }
}

async function initCurrentModel() {
  const userConfig = await getUserConfig()
  const endpointType = userConfig.llm.endpointType.get()
  const model = userConfig.llm.model.get()
  if (endpointType === 'ollama') {
    return false
  }
  else if (endpointType === 'openrouter') {
    return false
  }
  else if (endpointType === 'web-llm') {
    const connectInfo = initWebLLMEngine(model as WebLLMSupportedModel)
    return connectInfo.portName
  }
  else {
    throw new Error('Unsupported endpoint type ' + endpointType)
  }
}

const eventEmitter = new EventEmitter()

export type Events = {
  ready: (tabId: number) => void
}

export type EventKey = keyof Events

export function registerBackgroundRpcEvent<E extends EventKey>(ev: E, fn: (...args: Parameters<Events[E]>) => void) {
  logger.debug('registering background rpc event', ev)
  eventEmitter.on(ev, fn)
  return () => {
    eventEmitter.off(ev, fn)
  }
}

export async function showSidepanel(onlyCurrentTab?: boolean) {
  if (onlyCurrentTab) {
    const currentTab = await browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => tabs[0])
    const tabId = currentTab.id
    browser.sidePanel.open({ tabId, windowId: currentTab.windowId })
    return
  }
  browser.sidePanel.open({ windowId: browser.windows.WINDOW_ID_CURRENT })
}

function getTabCaptureMediaStreamId(tabId: number, consumerTabId?: number) {
  return new Promise<string | undefined>((resolve, reject) => {
    browser.tabCapture.getMediaStreamId(
      { targetTabId: tabId, consumerTabId },
      (streamId) => {
        if (browser.runtime.lastError) {
          logger.error('Failed to get media stream ID:', browser.runtime.lastError.message)
          reject(new CreateTabStreamCaptureError(browser.runtime.lastError.message))
        }
        else {
          resolve(streamId)
        }
      },
    )
  })
}

function captureVisibleTab(windowId?: number, options?: Browser.tabs.CaptureVisibleTabOptions) {
  const wid = windowId ?? browser.windows.WINDOW_ID_CURRENT
  const screenCaptureBase64Url = browser.tabs.captureVisibleTab(wid, options ?? {})
  return screenCaptureBase64Url
}

function getTabInfoByTabId(tabId: number) {
  return browser.tabs.get(tabId)
}

function ping() {
  return 'pong'
}

async function getLocalModelList() {
  const userConfig = await getUserConfig()
  const endpointType = userConfig.llm.endpointType.get()

  if (endpointType === 'openrouter') {
    // For OpenRouter, return predefined models
    return {
      models: PREDEFINED_OPENROUTER_MODELS.map((model) => ({
        model: model.id,
        name: model.name,
        size: 0,
        modifiedAt: new Date().toISOString(),
        quantizationLevel: undefined,
      })),
    }
  }
  else if (endpointType === 'ollama') {
    // For Ollama, use the existing function
    return await getOllamaLocalModelList()
  }
  else {
    // For web-llm, return empty list as models are handled differently
    return { models: [] }
  }
}

async function updateSidepanelModelList() {
  b2sRpc.emit('updateModelList')
  return true
}

async function getOpenRouterModels() {
  try {
    const userConfig = await getUserConfig()
    const apiKey = userConfig.llm.apiKey.get()

    if (!apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    const models = await getOpenRouterModelsWithCache(apiKey)
    logger.debug('Fetched OpenRouter models:', models.length)

    return { models }
  }
  catch (error) {
    logger.error('Error fetching OpenRouter models:', error)

    // Return fallback models if API fails
    return {
      models: POPULAR_OPENROUTER_MODELS.map((id): OpenRouterModel => ({
        id: id as string,
        name: id.split('/').pop() || id,
        description: 'Popular model',
        pricing: { prompt: '0', completion: '0' },
        context_length: 8192,
        architecture: { modality: 'text', tokenizer: 'unknown', instruct_type: 'unknown' },
        top_provider: { max_completion_tokens: 4096, is_moderated: false },
        per_request_limits: { prompt_tokens: '0', completion_tokens: '0' },
      })),
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function testOpenRouterConnection() {
  try {
    const userConfig = await getUserConfig()
    const apiKey = userConfig.llm.apiKey.get()

    if (!apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    // Test with a simple, cheap model
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nativemind.app',
        'X-Title': 'NativeMind',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    })

    // 402 means API key is valid but no credits - that's a successful connection
    if (response.status === 402) {
      const errorData = await response.json()
      throw new Error(`Payment Required: ${errorData.error?.message || 'Insufficient credits'}`)
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}. ${errorText}`)
    }

    return true
  }
  catch (error) {
    logger.error('OpenRouter connection test failed:', error)
    throw error
  }
}

async function clearOpenRouterModelsCacheRpc() {
  clearOpenRouterModelsCache()
  return true
}

export const backgroundFunctions = {
  emit: <E extends keyof Events>(ev: E, ...args: Parameters<Events[E]>) => {
    eventEmitter.emit(ev, ...args)
  },
  ping,
  getTabInfo: (_tabInfo?: { tabId: number }) => _tabInfo as TabInfo, // a trick to get tabId
  getTabInfoByTabId,
  generateText,
  generateTextAsync,
  streamText,
  getAllTabs,
  getLocalModelList,
  getRunningModelList,
  deleteOllamaModel,
  pullOllamaModel,
  showOllamaModelDetails,
  unloadOllamaModel,
  searchOnline,
  generateObjectFromSchema,
  getDocumentContentOfTab,
  getPageContentType,
  getPagePDFContent,
  fetchAsDataUrl,
  fetchAsText,
  streamObjectFromSchema,
  updateContextMenu: (...args: Parameters<ContextMenuManager['updateContextMenu']>) => ContextMenuManager.getInstance().then((manager) => manager.updateContextMenu(...args)),
  createContextMenu: (...args: Parameters<ContextMenuManager['createContextMenu']>) => ContextMenuManager.getInstance().then((manager) => manager.createContextMenu(...args)),
  deleteContextMenu: (...args: Parameters<ContextMenuManager['deleteContextMenu']>) => ContextMenuManager.getInstance().then((manager) => manager.deleteContextMenu(...args)),
  getTabCaptureMediaStreamId,
  initWebLLMEngine,
  hasWebLLMModelInCache,
  deleteWebLLMModelInCache,
  checkModelReady,
  initCurrentModel,
  checkSupportWebLLM,
  getSystemMemoryInfo,
  testOllamaConnection,
  captureVisibleTab,
  showSidepanel,
  showSettings: showSettingsForBackground,
  updateSidepanelModelList,
  getOpenRouterModels,
  testOpenRouterConnection,
  clearOpenRouterModelsCache: clearOpenRouterModelsCacheRpc,
}
;(self as unknown as { backgroundFunctions: unknown }).backgroundFunctions = backgroundFunctions
