import { extractReasoningMiddleware, LanguageModelV1, wrapLanguageModel } from 'ai'
import { createOllama } from 'ollama-ai-provider'

import { getUserConfig } from '@/utils/user-config'

import { WebLLMChatLanguageModel } from './providers/web-llm/openai-compatible-chat-language-model'
import { getWebLLMEngine, WebLLMSupportedModel } from './web-llm'

const reasoningMiddleware = extractReasoningMiddleware({
  tagName: 'think',
  separator: '\n\n',
  startWithReasoning: false,
})

export async function getModelUserConfig() {
  const userConfig = await getUserConfig()
  const baseUrl = userConfig.llm.baseUrl.get()
  const model = userConfig.llm.model.get()
  const apiKey = userConfig.llm.apiKey.get()
  const numCtx = userConfig.llm.numCtx.get()
  return {
    baseUrl,
    model,
    apiKey,
    numCtx,
  }
}

export type ModelLoadingProgressEvent = { type: 'loading', model: string, progress: number } | { type: 'finished' }

export async function getModel(options: {
  baseUrl: string
  model: string
  apiKey: string
  numCtx: number
  onLoadingModel?: (prg: ModelLoadingProgressEvent) => void
}) {
  const userConfig = await getUserConfig()
  let model: LanguageModelV1
  const endpointType = userConfig.llm.endpointType.get()
  if (endpointType === 'ollama') {
    const ollama = createOllama({
      baseURL: new URL('/api', options.baseUrl).href,
    })
    model = ollama(options.model, {
      numCtx: options.numCtx,
      structuredOutputs: true,
    })
  }
  else if (endpointType === 'web-llm') {
    const engine = await getWebLLMEngine({
      model: options.model as WebLLMSupportedModel,
      contextWindowSize: options.numCtx,
      onInitProgress(report) {
        options.onLoadingModel?.({ model: options.model, progress: report.progress, type: 'loading' })
      },
    })
    options.onLoadingModel?.({ type: 'finished' })
    model = new WebLLMChatLanguageModel(
      options.model,
      engine,
      {},
      { supportsStructuredOutputs: true, provider: 'web-llm', defaultObjectGenerationMode: 'json' },
    )
  }
  else {
    throw new Error('Unsupported endpoint type ' + endpointType)
  }
  return wrapLanguageModel({
    model,
    middleware: [reasoningMiddleware],
  })
}

export type LLMEndpointType = 'ollama' | 'web-llm'

export function parseErrorMessageFromChunk(error: unknown): string | null {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return null
}
