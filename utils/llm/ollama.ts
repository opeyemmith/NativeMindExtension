import { Ollama, ShowResponse } from 'ollama/browser'

import logger from '@/utils/logger'

import { getUserConfig } from '../user-config'

async function getOllamaClient() {
  const userConfig = await getUserConfig()
  const baseUrl = userConfig.llm.baseUrl.get()
  const origin = new URL(baseUrl).origin
  const ollama = new Ollama({ host: origin })
  return ollama
}

export async function getLocalModelList() {
  try {
    const ollama = await getOllamaClient()
    const response = await ollama.list()
    const usageResponse = await ollama.ps()
    const models = response.models.map((model) => {
      const usage = usageResponse.models.find((m) => m.model === model.model)
      return {
        ...model,
        ...usage,
      }
    })
    return { models }
  }
  catch (error) {
    logger.error('Error fetching local model list:', error)
    return {
      models: [],
      error: 'Failed to fetch local model list',
    }
  }
}

export async function getModelInfo(modelId: string) {
  const ollama = await getOllamaClient()
  return ollama.show({
    model: modelId,
  })
}

export async function deleteModel(modelId: string) {
  const ollama = await getOllamaClient()
  return ollama.delete({
    model: modelId,
  })
}

export async function pullModel(modelId: string) {
  const ollama = await getOllamaClient()
  const pulling = await ollama.pull({
    model: modelId,
    stream: true,
  })
  return pulling
}

export type ModelCapability = 'vision' | 'audio' | 'text' | 'code' | 'chat' | 'embedding'
export async function showModelDetails(modelId: string) {
  const ollama = await getOllamaClient()
  const info = await ollama.show({ model: modelId })
  return info as ShowResponse & {
    capabilities?: ModelCapability[]
  }
}
