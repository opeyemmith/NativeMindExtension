import { createOllama } from 'ollama-ai-provider'
import { userConfig } from '@/utils/user-config'

export async function getOllamaModelUserConfig() {
  const baseUrl = await userConfig.ollama.baseUrl.get()
  const model = await userConfig.ollama.model.get()
  return {
    baseUrl,
    model,
  }
}

export async function getOllamaModel(options: { baseUrl: string; model: string }) {
  console.log('getOllamaModel', options.baseUrl, options.model)
  const ollama = createOllama({
    baseURL: options.baseUrl,
  })

  return ollama(options.model)
}
