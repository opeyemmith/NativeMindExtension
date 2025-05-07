import { Config } from './helpers'

export const userConfig = {
  ollama: {
    baseUrl: new Config('ollama.baseUrl')
      .default('http://localhost:11434')
      .transform(value => (value.trim().endsWith('/api') ? value : `${value}/api`))
      .build(),
    model: new Config('ollama.model').default('qwen3:8b').build(),
  },
}
