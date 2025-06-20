export type ErrorCode = 'unknown' | 'requestError' | 'requestTimeout' | 'abortError' | 'timeoutError' | 'modelNotFound'

export abstract class AppError<Code extends ErrorCode> extends Error {
  private _appError = true
  message: string
  static isAppError(error: unknown): error is AppError<ErrorCode> {
    // can not check instanceof AppError directly because it may be from another context (e.g. from background script to content script)
    return (typeof error === 'object' && error !== null && '_appError' in error && error._appError === true)
  }

  constructor(public code: Code, message?: string) {
    super(message)
    this.message = message ?? ''
  }

  toLocaleMessage(_locale?: string): string {
    return this.message
  }
}

export class UnknownError extends AppError<'unknown'> {
  constructor(message: string) {
    super('unknown', message)
  }

  toLocaleMessage(): string {
    return 'An unexpected error occurred: ' + this.message
  }
}

export class ModelRequestError extends AppError<'requestError'> {
  constructor(message: string) {
    super('requestError', message)
  }

  toLocaleMessage(): string {
    return 'Oops! Something went wrong. Please check your Ollama connection in settings and try again.'
  }
}

export class ModelNotFoundError extends AppError<'modelNotFound'> {
  constructor(public model?: string) {
    super('modelNotFound')
  }

  toLocaleMessage(): string {
    return 'Oops! Something went wrong. Please check your Ollama connection in settings and try again.'
  }
}

export class ModelRequestTimeoutError extends AppError<'requestTimeout'> {
  constructor() {
    super('requestTimeout')
  }

  toLocaleMessage(): string {
    return 'Request timeout, please check your Ollama connection or consider starting a new session as long contexts may affect response times.'
  }
}

export class AbortError extends AppError<'abortError'> {
  constructor(message: string) {
    super('abortError', message)
  }

  toLocaleMessage(): string {
    return 'Request aborted: ' + this.message
  }
}

// common timeout error for various operations
export class TimeoutError extends AppError<'timeoutError'> {
  constructor(message: string) {
    super('timeoutError', message)
  }

  toLocaleMessage(): string {
    return 'Operation timed out: ' + this.message
  }
}

const errors = {
  unknown: UnknownError,
  requestError: ModelRequestError,
  requestTimeout: ModelRequestTimeoutError,
  abortError: AbortError,
  timeoutError: TimeoutError,
  modelNotFound: ModelNotFoundError,
} satisfies Record<ErrorCode, typeof AppError<ErrorCode>>

export function fromError(error: unknown): AppError<ErrorCode> {
  if (!AppError.isAppError(error)) {
    return new UnknownError('An unknown error occurred')
  }
  const ctor = errors[error.code] || UnknownError
  const instance = new ctor(error.message)
  Object.assign(instance, error) // preserve the original error properties
  return instance
}
