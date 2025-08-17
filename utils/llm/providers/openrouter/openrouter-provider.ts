import { EmbeddingModelV1, LanguageModelV1, ProviderV1 } from '@ai-sdk/provider'
import { withoutTrailingSlash } from '@ai-sdk/provider-utils'

import { OpenRouterChatLanguageModel } from './openrouter-chat-language-model'
import { OpenRouterChatModelId, OpenRouterChatSettings } from './openrouter-chat-settings'
import { OpenRouterEmbeddingModel } from './openrouter-embedding-model'
import {
  OpenRouterEmbeddingModelId,
  OpenRouterEmbeddingSettings,
} from './openrouter-embedding-settings'

export interface OpenRouterProvider extends ProviderV1 {
  (modelId: OpenRouterChatModelId, settings?: OpenRouterChatSettings): LanguageModelV1

  chat(
    modelId: OpenRouterChatModelId,
    settings?: OpenRouterChatSettings,
  ): LanguageModelV1

  embedding(
    modelId: OpenRouterEmbeddingModelId,
    settings?: OpenRouterEmbeddingSettings,
  ): EmbeddingModelV1<string>

  languageModel(
    modelId: OpenRouterChatModelId,
    settings?: OpenRouterChatSettings,
  ): LanguageModelV1

  textEmbeddingModel(
    modelId: OpenRouterEmbeddingModelId,
    settings?: OpenRouterEmbeddingSettings,
  ): EmbeddingModelV1<string>
}

export interface OpenRouterProviderSettings {
  /**
   * Base URL for OpenRouter API calls.
   */
  baseURL?: string
  /**
   * Custom fetch implementation. You can use it as a middleware to intercept
   * requests or to provide a custom fetch implementation for e.g. testing
   */
  fetch?: typeof fetch
  /**
   * @internal
   */
  generateId?: () => string
  /**
   * Custom headers to include in the requests.
   */
  headers?: Record<string, string>
  /**
   * OpenRouter API key.
   */
  apiKey?: string
}

export function createOpenRouter(
  options: OpenRouterProviderSettings = {},
): OpenRouterProvider {
  const baseURL
    = withoutTrailingSlash(options.baseURL) ?? 'https://openrouter.ai/api/v1'

  const getHeaders = () => ({
    'Authorization': `Bearer ${options.apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://nativemind.app',
    'X-Title': 'NativeMind',
    ...options.headers,
  })

  const createChatModel = (
    modelId: OpenRouterChatModelId,
    settings: OpenRouterChatSettings = {},
  ) =>
    new OpenRouterChatLanguageModel(modelId, settings, {
      baseURL,
      fetch: options.fetch,
      headers: getHeaders,
      provider: 'openrouter.chat',
    })

  const createEmbeddingModel = (
    modelId: OpenRouterEmbeddingModelId,
    settings: OpenRouterEmbeddingSettings = { input: [] },
  ) =>
    new OpenRouterEmbeddingModel(modelId, settings, {
      baseURL,
      fetch: options.fetch,
      headers: getHeaders,
      provider: 'openrouter.embedding',
    })

  const provider = function (
    modelId: OpenRouterChatModelId,
    settings?: OpenRouterChatSettings,
  ) {
    if (new.target) {
      throw new Error(
        'The OpenRouter model function cannot be called with the new keyword.',
      )
    }

    return createChatModel(modelId, settings)
  }

  provider.chat = createChatModel
  provider.embedding = createEmbeddingModel
  provider.languageModel = createChatModel
  provider.textEmbedding = createEmbeddingModel
  provider.textEmbeddingModel = createEmbeddingModel

  return provider as OpenRouterProvider
}

export const openrouter = createOpenRouter()
