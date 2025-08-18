import { defineStore } from 'pinia'
import { ref } from 'vue'

// import { OllamaModelInfo } from '@/types/ollama-models' // Removed - no longer supporting Ollama
import { logger } from '@/utils/logger'
import { c2bRpc, s2bRpc, settings2bRpc } from '@/utils/rpc'
import { getUserConfig } from '@/utils/user-config'

import { forRuntimes } from '../runtime'

const log = logger.child('store')

const rpc = forRuntimes({
  sidepanel: () => s2bRpc,
  settings: () => settings2bRpc,
  content: () => c2bRpc,
  default: () => { throw new Error('Unsupported runtime') },
})

/**
 * @deprecated This store is deprecated. Use useOpenRouterStore instead.
 * Keeping for backward compatibility during migration to OpenRouter-only.
 */
export const useOllamaStatusStore = defineStore('ollama-status', () => {
  const modelList = ref<any[]>([])
  const connectionStatus = ref<'connected' | 'error' | 'unconnected'>('connected') // Always connected for OpenRouter
  
  const updateModelList = async (): Promise<any[]> => {
    try {
      // For OpenRouter, delegate to the background function
      const response = await rpc.getLocalModelList()
      connectionStatus.value = 'connected'
      log.debug('Model list fetched:', response)
      modelList.value = response.models as unknown[]
      return modelList.value
    }
    catch (error) {
      log.error('Failed to fetch model list:', error)
      connectionStatus.value = 'error'
      return []
    }
  }

  const connectionStatusLoading = ref(false)
  const updateConnectionStatus = async () => {
    connectionStatusLoading.value = true
    
    try {
      // Check if we have an API key before testing connection
      const userConfig = await getUserConfig()
      const apiKey = userConfig.llm.apiKey.get()
      
      // If no API key is configured, return success without testing
      // This prevents automatic connection tests that would fail
      if (!apiKey) {
        log.debug('Skipping OpenRouter connection test - API key not configured')
        connectionStatus.value = 'connected' // Default to connected to prevent errors
        return true
      }
      
      // Only test connection if API key is configured
      const success = await rpc.testOpenRouterConnection().catch(() => false)
      connectionStatus.value = success ? 'connected' : 'error'
      return success
    } finally {
      connectionStatusLoading.value = false
    }
  }

  // Deprecated function - no-op for OpenRouter
  const unloadModel = async (_model: string) => {
    log.warn('unloadModel is deprecated - OpenRouter models cannot be unloaded')
    await updateModelList()
  }

  return {
    connectionStatusLoading,
    connectionStatus,
    modelList,
    unloadModel,
    updateModelList,
    updateConnectionStatus,
  }
})
