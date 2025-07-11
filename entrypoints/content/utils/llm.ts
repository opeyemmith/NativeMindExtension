import type { InitProgressReport } from '@mlc-ai/web-llm'
import { TextStreamPart, ToolSet } from 'ai'
import type { ProgressResponse } from 'ollama/browser'
import { browser } from 'wxt/browser'

import { toAsyncIter } from '@/utils/async'
import { AbortError, fromError, ModelRequestTimeoutError } from '@/utils/error'
import { SchemaName } from '@/utils/llm/output-schema'
import { WebLLMSupportedModel } from '@/utils/llm/web-llm'
import logger from '@/utils/logger'
import { c2bRpc } from '@/utils/rpc'

import { BackgroundAliveKeeper } from './keepalive'

const log = logger.child('llm')

const DEFAULT_PENDING_TIMEOUT = 60000 // 60 seconds

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
  const iter = toAsyncIter<TextStreamPart<ToolSet>>(
    (yieldData, done) => {
      port.onMessage.addListener((message: TextStreamPart<ToolSet>) => {
        if (abortSignal?.aborted) {
          port.disconnect()
          return done()
        }
        if (message.type === 'error') {
          done(fromError(message.error))
          return
        }
        yieldData(message)
      })
      port.onDisconnect.addListener(() => {
        aliveKeeper.dispose()
        done()
      })
      abortSignal?.addEventListener('abort', () => {
        logger.debug('stream text request aborted')
        done()
      })
    },
    {
      firstDataTimeout: timeout, // 60 seconds
    },
  )
  yield* iter
}

export async function* streamObjectInBackground(options: Parameters<typeof c2bRpc.streamObjectFromSchema>[0] & ExtraOptions) {
  const { abortSignal, timeout = DEFAULT_PENDING_TIMEOUT, ...restOptions } = options
  const { portName } = await c2bRpc.streamObjectFromSchema(restOptions)
  const aliveKeeper = new BackgroundAliveKeeper()
  const port = browser.runtime.connect({ name: portName })
  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      aliveKeeper.dispose()
      port.disconnect()
    })
  }
  const iter = toAsyncIter<TextStreamPart<ToolSet>>(
    (yieldData, done) => {
      port.onMessage.addListener((message: TextStreamPart<ToolSet>) => {
        if (abortSignal?.aborted) {
          port.disconnect()
          return done()
        }
        yieldData(message)
      })
      abortSignal?.addEventListener('abort', () => {
        logger.debug('stream object request aborted')
        done()
      })
      port.onDisconnect.addListener(() => {
        aliveKeeper.dispose()
        done()
      })
    },
    {
      firstDataTimeout: timeout,
    },
  )
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

export async function deleteOllamaModel(modelId: string) {
  await c2bRpc.deleteOllamaModel(modelId)
}

export async function* pullOllamaModel(modelId: string, abortSignal?: AbortSignal) {
  const { portName } = await c2bRpc.pullOllamaModel(modelId)
  const aliveKeeper = new BackgroundAliveKeeper()
  const port = browser.runtime.connect({ name: portName })
  abortSignal?.addEventListener('abort', () => {
    port.disconnect()
  })
  const iter = toAsyncIter<ProgressResponse>((yieldData, done) => {
    if (abortSignal?.aborted) done()
    port.onMessage.addListener((message) => {
      if ('error' in message) {
        yieldData(message)
        done(message.error)
      }
      else {
        yieldData(message)
      }
    })
    port.onDisconnect.addListener(() => {
      aliveKeeper.dispose()
      done()
    })
  })
  yield* iter
}

export async function* initWebLLMEngine(model: WebLLMSupportedModel) {
  const { portName } = await c2bRpc.initWebLLMEngine(model)
  const port = browser.runtime.connect({ name: portName })
  const iter = toAsyncIter<{ type: 'progress', progress: InitProgressReport } | { type: 'ready' }>((yieldData, done) => {
    port.onMessage.addListener((message) => {
      if (message.type === 'progress') {
        yieldData(message)
      }
      else if (message.type === 'ready') {
        done()
      }
    })
    port.onDisconnect.addListener(() => {
      done()
    })
  })
  yield* iter
}

export function isCurrentModelReady() {
  return c2bRpc.isCurrentModelReady()
}

export async function* initCurrentModel(abortSignal?: AbortSignal) {
  const portName = await c2bRpc.initCurrentModel()
  if (portName) {
    const port = browser.runtime.connect({ name: portName })
    const iter = toAsyncIter<{ type: 'progress', progress: InitProgressReport } | { type: 'ready' }>((yieldData, done) => {
      abortSignal?.addEventListener('abort', () => {
        port.disconnect()
        done(new Error('aborted'))
      })
      port.onMessage.addListener((message) => {
        if (message.type === 'progress') {
          abortSignal?.aborted && done(new Error('aborted'))
          yieldData(message)
        }
        else if (message.type === 'ready') {
          done()
        }
      })
      port.onDisconnect.addListener(() => {
        done()
      })
    })
    yield* iter
  }
}
