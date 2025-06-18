export interface Prompt {
  user: string
  system?: string
}

export function definePrompt<Args extends unknown[]>(cb: (...args: Args) => PromiseLike<Prompt> | Prompt) {
  return cb
}
