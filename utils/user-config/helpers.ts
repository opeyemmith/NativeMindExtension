import { storage } from '#imports'

const getLocalItem = async <T>(key: string) => {
  const item = await storage.getItem<T>(`local:${key}`)
  return item
}

const setLocalItem = async <T>(key: string, value: T) => {
  await storage.setItem(`local:${key}`, value)
}

const getSessionItem = async <T>(key: string) => {
  const item = await storage.getItem<T>(`session:${key}`)
  return item
}

const setSessionItem = async <T>(key: string, value: T) => {
  await storage.setItem(`session:${key}`, value)
}

export interface ConfigAccessor<T> {
  get: () => Promise<T>
  set: (value: T) => Promise<void>
}

export class ValidateError extends Error {
  constructor(public displayMessage: string) {
    super(displayMessage)
  }
}

export class Config<Value, DefaultValue extends Value | undefined> {
  defaultValue?: DefaultValue
  isSession = false
  transformer?: (value: Value | DefaultValue) => Value | DefaultValue
  validator?: (value: Value | DefaultValue) => { isValid: boolean; displayMessage?: string }
  constructor(private key: string) {}

  session() {
    this.isSession = true
    return this
  }

  default<D extends DefaultValue>(defaultValue: D) {
    this.defaultValue = defaultValue
    return this as unknown as Config<D, D>
  }

  transform(transformer: (value: Value | DefaultValue) => Value | DefaultValue) {
    this.transformer = transformer
    return this
  }

  validate(validator: (value: Value | DefaultValue) => { isValid: boolean; displayMessage?: string }) {
    this.validator = validator
    return this
  }

  build(): ConfigAccessor<Value | DefaultValue> {
    const snapshots: (Value | DefaultValue)[] = []
    const getItem = this.isSession ? getSessionItem : getLocalItem
    const setItem = this.isSession ? setSessionItem : setLocalItem
    return {
      get: async () => {
        const value = await getItem<Value | undefined>(this.key)
        if (this.transformer) {
          return this.transformer(value ?? (this.defaultValue as DefaultValue))
        }
        return value ?? (this.defaultValue as DefaultValue)
      },
      set: async (value: Value | DefaultValue) => {
        if (import.meta.env.DEV) {
          snapshots.push(value)
          console.log(`[${this.key}] set to ${value}`, snapshots)
        }
        if (this.validator) {
          const { isValid, displayMessage } = this.validator(value)
          if (!isValid) {
            throw new ValidateError(displayMessage ?? 'Invalid value')
          }
        }
        if (this.transformer) {
          value = this.transformer(value)
        }
        await setItem(this.key, value)
      },
    }
  }
}
