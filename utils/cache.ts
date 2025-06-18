export function lazyInitialize<T>(initializer: () => T): () => T {
  let value: T | undefined
  return () => {
    if (value === undefined) {
      value = initializer()
      return value
    }
    return value
  }
}
