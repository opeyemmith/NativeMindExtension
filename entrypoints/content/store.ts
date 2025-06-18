import { defineStore } from 'pinia'
import { ref } from 'vue'

import { logger } from '@/utils/logger'
import { c2bRpc } from '@/utils/rpc'

const log = logger.child('store')

export const useOllamaStatusStore = defineStore('ollama-status', () => {
  const modelList = ref<{ name: string, model: string, size_vram?: number, size?: number }[]>([])
  const connectionStatus = ref<'connected' | 'error' | 'unconnected'>('unconnected')
  const updateModelList = async () => {
    const response = await c2bRpc.getLocalModelList()
    log.debug('Model list fetched:', response)
    modelList.value = response.models
    return modelList.value
  }

  const connectionStatusLoading = ref(false)
  const updateConnectionStatus = async () => {
    connectionStatusLoading.value = true
    const success = await c2bRpc.testOllamaConnection().catch(() => false)
    connectionStatus.value = success ? 'connected' : 'error'
    connectionStatusLoading.value = false
    return success
  }

  return {
    connectionStatusLoading,
    connectionStatus,
    modelList,
    updateModelList,
    updateConnectionStatus,
  }
})
