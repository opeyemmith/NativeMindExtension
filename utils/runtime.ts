type EntrypointName = typeof APP_METADATA['entrypoint']

export function only<T>(entrypoints: EntrypointName[], fn: () => T) {
  const currentEntrypointName = APP_METADATA.entrypoint
  if (entrypoints.includes(currentEntrypointName)) {
    return fn()
  }
  return undefined as T
}

type EntrypointFn<T> = Partial<Record<EntrypointName, () => T>>
type EntrypointWithDefaultFn<T> = EntrypointFn<T> & { default: () => T }
type EntrypointWithOptionalDefaultFn<T> = EntrypointFn<T> & { default?: () => T }

export function forRuntimes<T>(runtimesFn: EntrypointFn<T>): T | undefined
export function forRuntimes<T>(runtimesFn: EntrypointWithDefaultFn<T>): T
export function forRuntimes<T>(runtimesFn: EntrypointWithOptionalDefaultFn<T>) {
  const currentEntrypointName = APP_METADATA.entrypoint
  if (currentEntrypointName && runtimesFn[currentEntrypointName]) {
    return runtimesFn[currentEntrypointName]()
  }
  return runtimesFn.default?.()
}
