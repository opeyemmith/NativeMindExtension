import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { OpenRouterModel } from '@/utils/llm/openrouter-models'
import { logger } from '@/utils/logger'
import { c2bRpc, s2bRpc, settings2bRpc } from '@/utils/rpc'

import { forRuntimes } from '../runtime'

const log = logger.child('openrouter-store')

// Primary model management store for OpenRouter-only architecture

const rpc = forRuntimes({
  sidepanel: () => s2bRpc,
  settings: () => settings2bRpc,
  content: () => c2bRpc,
  default: () => { throw new Error('Unsupported runtime') },
})

export interface OpenRouterModelInfo {
  model: string
  name: string
  description?: string
  pricing?: {
    prompt: string
    completion: string
  }
  contextLength?: number
  provider?: string
}

export const useOpenRouterStore = defineStore('openrouter', () => {
  const modelList = ref<OpenRouterModelInfo[]>([])
  const connectionStatus = ref<'connected' | 'error' | 'unconnected' | 'no-credits'>('unconnected')
  const isLoading = ref(false)
  const searchQuery = ref('')
  const lastError = ref<string | null>(null)
  const isValidated = ref(false) // Track if API key is validated
  const lastValidatedAt = ref(0) // Timestamp of last validation

  const updateModelList = async (): Promise<OpenRouterModelInfo[]> => {
    if (isLoading.value) return modelList.value

    isLoading.value = true
    lastError.value = null

    try {
      const response = await rpc.getOpenRouterModels()
      connectionStatus.value = 'connected'
      isValidated.value = true // Mark as validated on successful fetch
      log.debug('OpenRouter models fetched:', response.models.length)

      // Transform to our format
      modelList.value = response.models.map((model: OpenRouterModel) => ({
        model: model.id,
        name: model.name || model.id.split('/').pop() || model.id,
        description: model.description,
        pricing: model.pricing,
        contextLength: model.context_length,
        provider: model.id.split('/')[0],
      }))

      return modelList.value
    }
    catch (error: unknown) {
      log.error('Failed to fetch OpenRouter models:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch models'
      lastError.value = errorMessage
      isValidated.value = false // Mark as not validated on error

      // Determine error type
      if (errorMessage.includes('402') || errorMessage.includes('Payment Required') || errorMessage.includes('Insufficient credits')) {
        connectionStatus.value = 'no-credits'
      }
      else {
        connectionStatus.value = 'error'
      }

      return []
    }
    finally {
      isLoading.value = false
    }
  }

  const filteredModelList = computed(() => {
    if (!searchQuery.value.trim()) return modelList.value

    const query = searchQuery.value.toLowerCase()
    return modelList.value.filter((model) =>
      model.name.toLowerCase().includes(query)
      || model.model.toLowerCase().includes(query)
      || model.description?.toLowerCase().includes(query)
      || model.provider?.toLowerCase().includes(query),
    )
  })

  const modelsByProvider = computed(() => {
    const grouped: Record<string, OpenRouterModelInfo[]> = {}

    filteredModelList.value.forEach((model) => {
      const provider = model.provider || 'Other'
      if (!grouped[provider]) {
        grouped[provider] = []
      }
      grouped[provider].push(model)
    })

    // Sort providers by popularity
    const providerOrder = ['openai', 'anthropic', 'google', 'meta-llama', 'mistralai', 'cohere', 'microsoft', 'deepseek-ai', 'qwen', 'perplexity']

    const sortedGrouped: Record<string, OpenRouterModelInfo[]> = {}

    // Add popular providers first
    providerOrder.forEach((provider) => {
      if (grouped[provider]) {
        sortedGrouped[provider] = grouped[provider].sort((a, b) => a.name.localeCompare(b.name))
      }
    })

    // Add remaining providers
    Object.keys(grouped)
      .filter((provider) => !providerOrder.includes(provider.toLowerCase()))
      .sort()
      .forEach((provider) => {
        sortedGrouped[provider] = grouped[provider].sort((a, b) => a.name.localeCompare(b.name))
      })

    return sortedGrouped
  })

  const refreshModels = async () => {
    // Clear cache and force refresh
    await rpc.clearOpenRouterModelsCache()
    return updateModelList()
  }

  const testConnection = async (): Promise<boolean> => {
    try {
      await rpc.testOpenRouterConnection()
      connectionStatus.value = 'connected'
      return true
    }
    catch (error: unknown) {
      log.error('OpenRouter connection test failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed'
      lastError.value = errorMessage

      if (errorMessage.includes('402') || errorMessage.includes('Payment Required') || errorMessage.includes('Insufficient credits')) {
        connectionStatus.value = 'no-credits'
      }
      else {
        connectionStatus.value = 'error'
      }
      return false
    }
  }

  const clearValidation = () => {
    isValidated.value = false
    modelList.value = []
    connectionStatus.value = 'unconnected'
    lastError.value = null
  }

  const setValidated = (validated: boolean) => {
    isValidated.value = validated
    if (validated) {
      connectionStatus.value = 'connected'
      lastError.value = null
      lastValidatedAt.value = Date.now()
    }
  }

  return {
    // State
    modelList,
    connectionStatus,
    isLoading,
    searchQuery,
    lastError,
    isValidated,
    lastValidatedAt,

    // Computed
    filteredModelList,
    modelsByProvider,

    // Actions
    updateModelList,
    refreshModels,
    testConnection,
    clearValidation,
    setValidated,
  }
})
