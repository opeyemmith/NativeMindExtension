import { extractReasoningMiddleware, LanguageModelV1, wrapLanguageModel } from 'ai'

import { getUserConfig } from '@/utils/user-config'

import { ModelNotFoundError } from '../error'
import { createOpenRouter } from './providers/openrouter'
// Only OpenRouter provider supported

const reasoningMiddleware = extractReasoningMiddleware({
  tagName: 'think',
  separator: '\n\n',
  startWithReasoning: false,
})

export async function getModelUserConfig() {
  const userConfig = await getUserConfig()
  const model = userConfig.llm.model.get()
  const baseUrl = userConfig.llm.baseUrl.get()
  const apiKey = userConfig.llm.apiKey.get()
  const numCtx = userConfig.llm.numCtx.get()
  const enableNumCtx = userConfig.llm.enableNumCtx.get()
  const reasoning = userConfig.llm.reasoning.get()
  if (!model) {
    throw new ModelNotFoundError()
  }
  return {
    baseUrl,
    model,
    apiKey,
    numCtx,
    enableNumCtx,
    reasoning,
  }
}

export type ModelLoadingProgressEvent = { type: 'loading', model: string, progress: number } | { type: 'finished' }

export async function getModel(options: {
  baseUrl: string
  model: string
  apiKey: string
  numCtx: number
  enableNumCtx: boolean
  reasoning: boolean
  onLoadingModel?: (prg: ModelLoadingProgressEvent) => void
}) {
  // Only OpenRouter is supported
  const openrouter = createOpenRouter({
    baseURL: options.baseUrl,
    apiKey: options.apiKey,
  })
  const model = openrouter(options.model, {
    structuredOutputs: true,
  })
  
  return wrapLanguageModel({
    model,
    middleware: [reasoningMiddleware],
  })
}

export type LLMEndpointType = 'openrouter' // Only OpenRouter supported

export function parseErrorMessageFromChunk(error: unknown): string | null {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return null
}

export function isModelSupportPDFToImages(_model: string): boolean {
  // Currently only gemma3 models have the ability to understand PDF converted to images
  // but it's too slow to process large number of image so we disable this feature temporarily by returning false here
  return false
}
