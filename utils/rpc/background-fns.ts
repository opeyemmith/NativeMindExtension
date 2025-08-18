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
import { AppError, CreateTabStreamCaptureError, FetchError, GenerateObjectSchemaError, ModelRequestError, RateLimitError, UnknownError } from '../error'
import { getModel, getModelUserConfig, ModelLoadingProgressEvent } from '../llm/models'
import { ContextMenuId } from '../context-menu'

import {
  clearOpenRouterModelsCache,
  getOpenRouterModelsWithCache,
  OpenRouterModel,
} from '../llm/openrouter-models'
import { SchemaName, Schemas, selectSchema } from '../llm/output-schema'
import { PREDEFINED_OPENROUTER_MODELS } from '../llm/predefined-models'
import { selectTools, ToolName, ToolWithName } from '../llm/tools'
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
  else if (_error instanceof Error && _error.message.includes('Rate limit exceeded')) {
    error = new RateLimitError(_error.message)
  }
  else if (_error instanceof Error && _error.name === 'AI_RetryError') {
    // Check if this is a rate limiting issue - AI_RetryError often indicates rate limiting
    // Since we're using OpenRouter and most failures are due to rate limits, assume it's a rate limit error
    if (_error.message.includes('429') || _error.message.includes('Too Many Requests') || _error.message.includes('Rate limit') || _error.message.includes('Failed after 3 attempts')) {
      error = new RateLimitError(_error.message)
    } else {
      error = new ModelRequestError(`Request failed after multiple attempts. This may be due to high server load or rate limiting. Please try again in a moment.`)
    }
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

const fetchAsDataUrl = async (url: string, initOptions?: RequestInit & { silentErrors?: boolean }) => {
  const isFaviconUrl = url.includes('favicon.ico') || url.includes('favicons/') || url.includes('icon')
  const shouldSilentError = initOptions?.silentErrors || isFaviconUrl
  
  try {
  const response = await fetch(url, initOptions)
  if (!response.ok) {
      const error = new FetchError(`Failed to fetch ${url}: ${response.statusText}`)
      if (shouldSilentError) {
        // For favicon requests, log at debug level instead of error level
        logger.debug(`Favicon fetch failed (${response.status}): ${url}`)
        throw error
      }
      throw error
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
  } catch (error) {
    if (shouldSilentError && (error instanceof FetchError || (error instanceof Error && error.message.includes('fetch')))) {
      // For favicon requests, log at debug level instead of error level
      logger.debug(`Favicon fetch failed: ${url}`, error)
    }
    throw error
  }
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



async function testConnection() {
  const userConfig = await getUserConfig()
  
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
        'HTTP-Referer': 'https://nativemind.app',
        'X-Title': 'NativeMind',
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



async function getSystemMemoryInfo() {
  if (import.meta.env.FIREFOX) throw new Error('system.memory API is not supported in Firefox')
  return browser.system.memory.getInfo()
}



async function checkModelReady(modelId: string) {
  try {
    // For OpenRouter, models are always ready since they're cloud-based
    // We could add additional validation here like checking if the model exists in OpenRouter's catalog
    return true
  }
  catch (error) {
    logger.error('Error checking current model readiness:', error)
    return false
  }
}

async function initCurrentModel() {
  // OpenRouter models don't need initialization since they're cloud-based
  // Always return false to indicate no initialization is needed
    return false
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
  // For OpenRouter, return predefined popular models
  // This provides a quick list of available models without requiring API calls
    return {
      models: PREDEFINED_OPENROUTER_MODELS.map((model) => ({
        model: model.id,
        name: model.name,
      size: 0, // Cloud models don't have local size
        modifiedAt: new Date().toISOString(),
      quantizationLevel: undefined, // Not applicable for cloud models
    })),
  }
}

async function updateSidepanelModelList() {
  return await safeEmit('updateModelList');
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
    // No fallbacks - always throw the error
    throw error
  }
}

async function testOpenRouterConnection() {
  try {
    const userConfig = await getUserConfig()
    const apiKey = userConfig.llm.apiKey.get()

    if (!apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    // Test connection by fetching available models instead of making a chat completion
    // This is more reliable and doesn't require a specific model to be available
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nativemind.app',
        'X-Title': 'NativeMind',
      },
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

async function notifyApiKeyValidated() {
  // Emit to all connected components that API key is validated (non-blocking)
  const result = await safeEmit('updateModelList'); // Use existing event for now
  if (result) {
    logger.debug('API key validation event emitted');
  }
  return result;
}

async function validateOpenRouterApiKey() {
  try {
    const userConfig = await getUserConfig()
    const apiKey = userConfig.llm.apiKey.get()
    const baseUrl = userConfig.llm.baseUrl.get()

    if (!apiKey || !apiKey.trim()) {
      throw new Error('OpenRouter API key not configured')
    }

    // Test the API key using the auth endpoint which properly validates keys
    const response = await fetch(`${baseUrl}/auth/key`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nativemind.app',
        'X-Title': 'NativeMind',
      },
    })

    if (response.status === 401) {
      throw new Error('Invalid API key - authentication failed')
    }

    if (response.status === 403) {
      throw new Error('API key does not have permission to access models')
    }

    if (response.status === 402) {
      // API key is valid but no credits
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Valid API key but insufficient credits: ${errorData.error?.message || 'Add credits to your OpenRouter account'}`)
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`)
    }

    let authData
    try {
      authData = await response.json()
    } catch (parseError) {
      logger.error('Failed to parse auth response as JSON:', parseError)
      throw new Error('Invalid JSON response from OpenRouter auth API')
    }
    
    if (!authData || !authData.data) {
      logger.error('Invalid auth response structure:', authData)
      throw new Error('Invalid response format from OpenRouter auth API')
    }

    // API key is valid, now get the model count
    const modelsResponse = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nativemind.app',
        'X-Title': 'NativeMind',
      },
    })

    let modelCount = 0
    if (modelsResponse.ok) {
      try {
        const modelsData = await modelsResponse.json()
        modelCount = modelsData.data?.length || 0
      } catch (modelsParseError) {
        logger.warn('Failed to parse models response, but auth succeeded:', modelsParseError)
        modelCount = 0
      }
    }

    logger.info('API key validation successful:', modelCount, 'models available')
    
    return {
      valid: true,
      modelCount: modelCount,
      authData: authData.data
    }
  }
  catch (error) {
    logger.error('API key validation failed:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : '❌ Unable to validate API key. Please try again!',
      modelCount: 0
    }
  }
}

// Utility function for safe emission of events to sidepanel
// This prevents uncaught promise rejections due to timeouts
export async function safeEmit(event: 'updateModelList'): Promise<boolean>;
export async function safeEmit(event: 'contextMenuClicked', data: Browser.contextMenus.OnClickData & { menuItemId: ContextMenuId }): Promise<boolean>;
export async function safeEmit(event: string, data?: any): Promise<boolean> {
  try {
    if (data !== undefined) {
      await b2sRpc.emit(event as any, data);
    } else {
      await b2sRpc.emit(event as any);
    }
    return true;
  } catch (error) {
    logger.debug(`Non-critical emit error on "${event}":`, error);
    return false;
  }
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
  // getRunningModelList removed with Ollama - no longer supporting local LLM
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
  // WebLLM functions removed - no longer supporting local LLM
  checkModelReady,
  initCurrentModel,
  getSystemMemoryInfo,
  testConnection,
  captureVisibleTab,
  showSidepanel,
  showSettings: showSettingsForBackground,
  updateSidepanelModelList,
  getOpenRouterModels,
  testOpenRouterConnection,
  clearOpenRouterModelsCache: clearOpenRouterModelsCacheRpc,
  validateOpenRouterApiKey,
  notifyApiKeyValidated,
}
;(self as unknown as { backgroundFunctions: unknown }).backgroundFunctions = backgroundFunctions
