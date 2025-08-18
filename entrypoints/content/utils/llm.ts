import type { InitProgressReport } from '@mlc-ai/web-llm'
import { TextStreamPart, ToolSet } from 'ai'
import type { ProgressResponse } from 'ollama/browser'
import { browser } from 'wxt/browser'

import { readPortMessageIntoIterator, toAsyncIter } from '@/utils/async'
import { AbortError, fromError, ModelRequestTimeoutError } from '@/utils/error'
import { BackgroundAliveKeeper } from '@/utils/keepalive'
import { SchemaName } from '@/utils/llm/output-schema'
// import { WebLLMSupportedModel } from '@/utils/llm/web-llm' // Removed - no longer supporting WebLLM
import logger from '@/utils/logger'
import { c2bRpc } from '@/utils/rpc'

const log = logger.child('llm')

const DEFAULT_PENDING_TIMEOUT = 60_000 // 60 seconds

interface ExtraOptions {
  abortSignal?: AbortSignal
  timeout?: number
}

export async function* streamTextInBackground(options: Parameters<typeof c2bRpc.streamText>[0] & ExtraOptions) {
  const { abortSignal, timeout = DEFAULT_PENDING_TIMEOUT, ...restOptions } = options
  const { portName } = await c2bRpc.streamText(restOptions)
  const aliveKeeper = new BackgroundAliveKeeper()
  const port = browser.runtime.connect({ name: portName })
  abortSignal?.addEventListener('abort', () => {
    aliveKeeper.dispose()
    port.disconnect()
  })
  const iter = readPortMessageIntoIterator<TextStreamPart<ToolSet>>(port, { abortSignal, firstDataTimeout: timeout, onTimeout: () => port.disconnect() })
  yield* iter
}

export async function* streamObjectInBackground(options: Parameters<typeof c2bRpc.streamObjectFromSchema>[0] & ExtraOptions) {
  const { abortSignal, timeout = DEFAULT_PENDING_TIMEOUT, ...restOptions } = options
  const { portName } = await c2bRpc.streamObjectFromSchema(restOptions)
  const aliveKeeper = new BackgroundAliveKeeper()
  const port = browser.runtime.connect({ name: portName })
  port.onDisconnect.addListener(() => aliveKeeper.dispose())
  abortSignal?.addEventListener('abort', () => {
    aliveKeeper.dispose()
    port.disconnect()
  })
  const iter = readPortMessageIntoIterator<TextStreamPart<ToolSet>>(port, { abortSignal, firstDataTimeout: timeout, onTimeout: () => port.disconnect() })
  yield* iter
}

export async function generateObjectInBackground<S extends SchemaName>(options: Parameters<typeof c2bRpc.generateObjectFromSchema<S>>[0] & ExtraOptions) {
  const { promise: abortPromise, resolve, reject } = Promise.withResolvers<Awaited<ReturnType<typeof c2bRpc.generateObjectFromSchema<S>>>>()
  const { abortSignal, timeout = DEFAULT_PENDING_TIMEOUT, ...restOptions } = options
  const aliveKeeper = new BackgroundAliveKeeper()
  abortSignal?.addEventListener('abort', () => {
    log.debug('generate object request aborted')
    aliveKeeper.dispose()
    reject(new AbortError('Aborted'))
  })
  const timeoutTimer = setTimeout(() => {
    log.warn('generate object request timeout', restOptions)
    reject(new ModelRequestTimeoutError())
  }, timeout)
  const promise = await c2bRpc
    .generateObjectFromSchema({
      ...restOptions,
    })
    .then((result) => {
      clearTimeout(timeoutTimer)
      log.debug('generate object result', result)
      resolve(result)
      return result
    }).catch((error) => {
      throw fromError(error)
    }).finally(() => {
      aliveKeeper.dispose()
    })
  return await Promise.race([abortPromise, promise])
}

// deleteOllamaModel and pullOllamaModel removed - no longer supporting Ollama

// initWebLLMEngine removed - no longer supporting WebLLM

export function checkModelReady(modeId: string) {
  return c2bRpc.checkModelReady(modeId)
}

// initCurrentModel removed - no longer needed for cloud providers
// Cloud providers like OpenRouter don't require local model initialization
