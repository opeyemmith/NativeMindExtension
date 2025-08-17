import { EmbeddingModelV1 } from '@ai-sdk/provider'
import { createJsonResponseHandler, postJsonToApi } from '@ai-sdk/provider-utils'
import { z } from 'zod'

import { OpenRouterEmbeddingModelId, OpenRouterEmbeddingSettings } from './openrouter-embedding-settings'
import { openrouterFailedResponseHandler } from './openrouter-error'

interface OpenRouterEmbeddingConfig {
  baseURL: string
  fetch?: typeof fetch
  headers: () => Record<string, string | undefined>
  provider: string
}

export class OpenRouterEmbeddingModel implements EmbeddingModelV1<string> {
  readonly specificationVersion = 'v1'
  readonly maxEmbeddingsPerCall = 2048
  readonly supportsParallelCalls = true

  constructor(
    public readonly modelId: OpenRouterEmbeddingModelId,
    public readonly settings: OpenRouterEmbeddingSettings,
    public readonly config: OpenRouterEmbeddingConfig,
  ) {}

  get provider(): string {
    return this.config.provider
  }

  async doEmbed(
    options: { values: string[], abortSignal?: AbortSignal, headers?: Record<string, string | undefined> },
  ): Promise<{ embeddings: number[][], usage?: { tokens: number }, rawResponse?: { headers?: Record<string, string> } }> {
    const { values } = options
    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/embeddings`,
      headers: this.config.headers(),
      body: {
        model: this.modelId,
        input: values,
      },
      failedResponseHandler: openrouterFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        z.object({
          object: z.string(),
          data: z.array(
            z.object({
              object: z.string(),
              embedding: z.array(z.number()),
              index: z.number(),
            }),
          ),
          usage: z.object({
            prompt_tokens: z.number(),
            total_tokens: z.number(),
          }),
        }),
      ),
      abortSignal: options?.abortSignal,
      fetch: this.config.fetch,
    })

    return {
      embeddings: response.data.map((item) => item.embedding),
      usage: {
        tokens: response.usage.total_tokens,
      },
      rawResponse: { headers: responseHeaders },
    }
  }
}
