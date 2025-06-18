import { ModelRequestTimeoutError } from './error'

export async function waitForIdle() {
  return new Promise<IdleDeadline>((resolve) => {
    requestIdleCallback(resolve, { timeout: 500 })
  })
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type IterValue<T> = { value: T, done: false, error?: unknown } | { value: undefined, done: true, error?: unknown }

interface ToAsyncIterOptions {
  firstDataTimeout?: number
}

export function toAsyncIter<T>(cb: (yieldData: (value: T) => void, doneCb: (err?: unknown) => void) => void, options?: ToAsyncIterOptions) {
  let timeoutTimer: number | undefined
  if (options?.firstDataTimeout) {
    timeoutTimer = window.setTimeout(() => {
      rejectNext?.(new ModelRequestTimeoutError())
    }, options.firstDataTimeout)
  }
  const q: IterValue<T>[] = []
  let resolveNext: ((value: IterValue<T>) => void) | null = null
  let rejectNext: ((reason?: unknown) => void) | null = null
  const onData = (value: T) => {
    clearTimeout(timeoutTimer)
    if (resolveNext) {
      resolveNext({ value, done: false })
      resolveNext = null
    }
    else q.push({ value, done: false })
  }
  const done = (err: unknown) => {
    if (resolveNext) {
      if (err) {
        rejectNext?.(err)
      }
      else {
        resolveNext({ value: undefined, done: true })
      }
      resolveNext = null
      rejectNext = null
    }
    else {
      q.push({ value: undefined, done: true, error: err })
    }
  }
  cb(onData, done)

  return {
    [Symbol.asyncIterator]() {
      return this
    },
    next() {
      if (q.length) {
        const last = q.pop()!
        if (last.error) {
          return Promise.reject(last.error)
        }
        else {
          return Promise.resolve({ value: last.value, done: last.done } as IterValue<T>)
        }
      }
      const { promise, resolve, reject } = Promise.withResolvers<IterValue<T>>()
      resolveNext = resolve
      rejectNext = reject
      return promise
    },
  }
}
