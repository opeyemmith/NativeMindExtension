import {
  LanguageModelV1,
  LanguageModelV1CallWarning,
  LanguageModelV1FinishReason,
  LanguageModelV1FunctionToolCall,
  LanguageModelV1StreamPart,
} from '@ai-sdk/provider'
import {
  createJsonResponseHandler,
  postJsonToApi,
} from '@ai-sdk/provider-utils'
import { z } from 'zod'

import { generateRandomId } from '@/utils/id'

import { OpenRouterChatModelId, OpenRouterChatSettings } from './openrouter-chat-settings'
import { openrouterFailedResponseHandler } from './openrouter-error'

interface OpenRouterChatConfig {
  baseURL: string
  fetch?: typeof fetch
  headers: () => Record<string, string | undefined>
  provider: string
}

export class OpenRouterChatLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1'
  readonly defaultObjectGenerationMode = 'json'
  readonly supportsImageUrls = false

  constructor(
    public readonly modelId: OpenRouterChatModelId,
    public readonly settings: OpenRouterChatSettings,
    public readonly config: OpenRouterChatConfig,
  ) {}

  get supportsStructuredOutputs(): boolean {
    return this.settings.structuredOutputs ?? false
  }

  get provider(): string {
    return this.config.provider
  }

  private getArguments({
    frequencyPenalty,
    maxTokens,
    mode,
    presencePenalty,
    prompt,
    responseFormat,
    seed,
    stopSequences,
    temperature,
    topK: _topK,
    topP,
  }: Parameters<LanguageModelV1['doGenerate']>[0]) {
    const _type = mode.type

    const warnings: LanguageModelV1CallWarning[] = []

    if (
      responseFormat !== undefined
      && responseFormat.type === 'json'
      && responseFormat.schema !== undefined
      && !this.supportsStructuredOutputs
    ) {
      warnings.push({
        details:
          'JSON response format schema is only supported with structuredOutputs',
        setting: 'responseFormat',
        type: 'unsupported-setting',
      })
    }

    const baseArguments = {
      model: this.modelId,
      messages: prompt,
      max_tokens: maxTokens,
      temperature: temperature,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      stop: stopSequences,
      seed: seed,
      stream: false,
      ...(responseFormat && { response_format: responseFormat }),
    }

    return {
      arguments: baseArguments,
      warnings,
    }
  }

  async doGenerate(
    options: Parameters<LanguageModelV1['doGenerate']>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1['doGenerate']>>> {
    const { arguments: args, warnings } = this.getArguments(options)

    // Debug logging - uncomment for debugging
    // console.log('OpenRouter Request:', {
    //   url: `${this.config.baseURL}/chat/completions`,
    //   headers: this.config.headers(),
    //   body: args,
    //   modelId: this.modelId,
    // })

    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: this.config.headers(),
      body: args,
      failedResponseHandler: openrouterFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        z.object({
          id: z.string(),
          object: z.string(),
          created: z.number(),
          model: z.string(),
          choices: z.array(
            z.object({
              index: z.number(),
              message: z.object({
                role: z.string(),
                content: z.string().nullable(),
                tool_calls: z
                  .array(
                    z.object({
                      id: z.string(),
                      type: z.string(),
                      function: z.object({
                        name: z.string(),
                        arguments: z.string(),
                      }),
                    }),
                  )
                  .optional(),
              }),
              finish_reason: z.string().nullable(),
            }),
          ),
          usage: z.object({
            prompt_tokens: z.number(),
            completion_tokens: z.number(),
            total_tokens: z.number(),
          }),
        }),
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    })

    const choice = response.choices[0]
    if (!choice) {
      throw new Error('No choice returned from OpenRouter API')
    }

    const toolCalls: LanguageModelV1FunctionToolCall[] = []
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        toolCalls.push({
          args: toolCall.function.arguments,
          toolCallId: toolCall.id,
          toolCallType: 'function',
          toolName: toolCall.function.name,
        })
      }
    }

    const { messages: rawPrompt, ...rawSettings } = args

    return {
      finishReason: this.mapFinishReason(choice.finish_reason),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      text: choice.message.content ?? undefined,
      toolCalls,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      },
      warnings,
    }
  }

  async doStream(
    options: Parameters<LanguageModelV1['doStream']>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1['doStream']>>> {
    const { arguments: args, warnings } = this.getArguments(options)

    // Debug logging - uncomment for debugging
    // console.log('OpenRouter Stream Request:', {
    //   url: `${this.config.baseURL}/chat/completions`,
    //   headers: this.config.headers(),
    //   body: { ...args, stream: true },
    //   modelId: this.modelId,
    // })

    // Filter out undefined values from headers
    const headers = Object.fromEntries(
      Object.entries(this.config.headers()).filter(([_, value]) => value !== undefined),
    ) as Record<string, string>

    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...args, stream: true }),
      signal: options.abortSignal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      // Handle rate limiting specifically
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        const resetTime = response.headers.get('x-ratelimit-reset')
        throw new Error(`Rate limit exceeded. ${retryAfter ? `Retry after ${retryAfter} seconds.` : ''} ${resetTime ? `Rate limit resets at ${new Date(parseInt(resetTime) * 1000).toLocaleTimeString()}.` : ''} Consider upgrading your OpenRouter plan or waiting before making more requests.`)
      }
      
      try {
        const errorData = JSON.parse(errorText)
        throw new Error(errorData.error?.message || `OpenRouter API error (${response.status}): ${response.statusText}`)
      }
      catch {
        throw new Error(`OpenRouter API error (${response.status}): ${response.statusText}`)
      }
    }

    // Convert Headers to plain object
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    const reader = response.body?.getReader()

    if (!reader) {
      throw new Error('No response body from OpenRouter API')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    // Bind this context for mapFinishReason
    const mapFinishReason = this.mapFinishReason.bind(this)

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed || !trimmed.startsWith('data: ')) continue

              const data = trimmed.slice(6)
              if (data === '[DONE]') {
                controller.close()
                return
              }

              try {
                const parsed = JSON.parse(data)
                const choice = parsed.choices?.[0]

                if (!choice) continue

                if (choice.delta?.content) {
          controller.enqueue({
            type: 'text-delta',
            textDelta: choice.delta.content,
          })
        }

                if (choice.delta?.tool_calls) {
          for (const toolCall of choice.delta.tool_calls) {
            controller.enqueue({
              type: 'tool-call-delta',
              toolCallId: toolCall.id || generateRandomId(),
              toolCallType: 'function',
              toolName: toolCall.function?.name || '',
              argsTextDelta: toolCall.function?.arguments || '',
            })
          }
        }

        if (choice.finish_reason) {
          controller.enqueue({
            type: 'finish',
                    finishReason: mapFinishReason(choice.finish_reason),
                    usage: parsed.usage
              ? {
                          promptTokens: parsed.usage.prompt_tokens,
                          completionTokens: parsed.usage.completion_tokens,
                }
              : {
                  promptTokens: 0,
                  completionTokens: 0,
                },
          })
        }
              }
              catch (_parseError) {
                // console.warn('Failed to parse OpenRouter SSE chunk:', parseError, data)
              }
            }
          }
        }
        catch (error) {
          controller.error(error)
        }
        finally {
          reader.releaseLock()
        }
      },
    })

    const { messages: rawPrompt, ...rawSettings } = args

    return {
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      stream,
      warnings,
    }
  }

  private mapFinishReason(finishReason: string | null): LanguageModelV1FinishReason {
    switch (finishReason) {
      case 'stop':
        return 'stop'
      case 'length':
        return 'length'
      case 'tool_calls':
        return 'tool-calls'
      case 'content_filter':
        return 'content-filter'
      default:
        return 'unknown'
    }
  }
}
