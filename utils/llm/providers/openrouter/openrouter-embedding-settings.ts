export type OpenRouterEmbeddingModelId =
  | 'openai/text-embedding-3-small'
  | 'openai/text-embedding-3-large'
  | 'openai/text-embedding-ada-002'
  | 'cohere/embed-english-v3.0'
  | 'cohere/embed-multilingual-v3.0'
  | 'nomic-ai/nomic-embed-text-v1.5'
  | (string & NonNullable<unknown>)

export interface OpenRouterEmbeddingSettings {
  /**
   * The input text to embed.
   */
  input: string | string[]
}
