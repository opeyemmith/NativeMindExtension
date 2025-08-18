<template>
  <div
    ref="settingsRef"
    class="flex flex-col font-inter"
  >
    <BlockTitle
      :title="t('settings.general.title')"
      :description="t('settings.general.description')"
    />
    <!-- Download modals removed - cloud-only approach -->
    <div class="flex flex-col gap-4">
      <Block :title="t('settings.provider_model.title')">
        <div class="flex flex-col gap-4">
          <Section>
            <div class="flex flex-col gap-6 items-stretch">
              <ScrollTarget
                :autoScrollIntoView="settingsQuery.scrollTarget.value === 'server-address-section'"
                showHighlight
                class="w-full"
              >
                <Section
                  :title="t('settings.cloud_provider.api_endpoint')"
                  class="w-full"
                >
                  <div class="flex flex-col gap-1">
                    <div class="flex gap-3 items-stretch">
                      <Input
                        v-model="baseUrl"
                        class="rounded-md py-2 px-4 grow"
                      />
                    </div>
                    <Text
                      color="secondary"
                      size="xs"
                      display="block"
                    >
                      {{ t('settings.cloud_provider.api_endpoint_desc') }}
                    </Text>
                    <SavedMessage :watch="baseUrl" />
                  </div>
                </Section>
              </ScrollTarget>
              <ScrollTarget
                :autoScrollIntoView="settingsQuery.scrollTarget.value === 'openrouter-config-section'"
                showHighlight
                class="w-full"
              >
                <Section
                  title="OpenRouter Configuration"
                  class="w-full"
                >
                  <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                      <div class="flex gap-3 items-stretch">
                        <Input
                          v-model="baseUrl"
                          placeholder="https://openrouter.ai/api/v1"
                          class="rounded-md py-2 px-4 grow"
                        />
                      </div>
                      <Text
                        color="secondary"
                        size="xs"
                        display="block"
                      >
                        OpenRouter API endpoint URL
                      </Text>
                      <SavedMessage :watch="baseUrl" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <div class="flex gap-3 items-stretch">
                        <Input
                          v-model="apiKey"
                          type="password"
                          placeholder="Enter your OpenRouter API key"
                          class="rounded-md py-2 px-4 grow"
                        />
                        <Button
                          variant="secondary"
                          class="px-4 py-2 shrink-0"
                          :disabled="!apiKey || validationLoading"
                          @click="validateApiKey"
                        >
                          <Loading v-if="validationLoading" class="w-4 h-4" />
                          <span v-else>{{ validationStatus === 'valid' ? 'Validated' : 'Validate' }}</span>
                        </Button>
                      </div>
                      <Text
                        color="secondary"
                        size="xs"
                        display="block"
                      >
                        Your OpenRouter API key (get one at openrouter.ai)
                      </Text>
                      <!-- Validation Status -->
                      <div v-if="validationStatus" class="flex items-center gap-2 text-xs">
                        <div v-if="validationStatus === 'valid'" class="flex items-center gap-1 text-green-600">
                          <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>API key is valid - {{ modelCount }} models available</span>
                        </div>
                        <div v-else-if="validationStatus === 'invalid'" class="flex items-center gap-1 text-red-600">
                          <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                          <span>{{ validationError }}</span>
                        </div>
                        <div v-else-if="validationStatus === 'no-credits'" class="flex items-center gap-1 text-yellow-600">
                          <span class="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          <span>API key valid but insufficient credits</span>
                        </div>
                      </div>
                      <SavedMessage :watch="apiKey" />
                    </div>
                  </div>
                </Section>
              </ScrollTarget>
              <Section class="w-full">
                <template #title>
                  <div class="flex justify-between">
                    <Text
                      class="font-medium text-sm"
                      display="block"
                    >
                      {{ t('settings.ollama.context_window_size') }}
                    </Text>
                    <div class="flex gap-2 items-center">
                      <Checkbox v-model="enableNumCtx">
                        <template #label>
                          <Text
                            class="font-medium text-xs"
                            display="block"
                          >
                            {{ t('settings.ollama.custom_context_window_size') }}
                          </Text>
                        </template>
                      </Checkbox>
                    </div>
                  </div>
                </template>
                <div class="flex flex-col gap-1">
                  <div class="flex gap-3 items-stretch">
                    <Input
                      v-model="numCtx"
                      min="512"
                      :error="!!numCtxError"
                      type="number"
                      :disabled="!enableNumCtx"
                      class="rounded-md py-2 px-4 grow"
                    />
                  </div>
                  <div>
                    <Text
                      color="secondary"
                      size="xs"
                      display="block"
                    >
                      {{ t('settings.ollama.context_window_size_desc') }}
                    </Text>
                    <SavedMessage
                      v-if="!numCtxError"
                      :watch="[guardedNumCtx, enableNumCtx]"
                    />
                  </div>
                  <WarningMessage
                    v-if="numCtxError"
                    class="text-xs"
                    :message="numCtxError"
                  />
                </div>
              </Section>
              <RunningModels />
              <div v-if="connectionStatus !== 'connected'">
                <Text
                  color="secondary"
                  size="xs"
                  class="font-normal leading-4"
                >
                  <div class="flex gap-1">
                    <span>Check your OpenRouter API key and connection.</span>
                    <a
                      href="https://openrouter.ai"
                      target="_blank"
                      class="underline whitespace-nowrap hover:text-gray-800 cursor-pointer"
                    >
                      Visit OpenRouter
                    </a>
                  </div>
                </Text>
              </div>
              <div class="-mt-2">
                <div class="flex items-center justify-center flex-wrap gap-2 w-full font-medium">
                  <Button
                    variant="secondary"
                    class="flex items-center justify-center min-h-8 min-w-40 py-1"
                    @click="testConnection"
                  >
                    <Loading
                      v-if="loading"
                      :size="12"
                    />
                    <span v-else>
                      {{ t('settings.general.refresh_status') }}
                    </span>
                  </Button>
                  <!-- Discover more models button removed - no longer supporting Ollama -->
                </div>
              </div>
            </div>
          </Section>
        </div>
      </Block>
      <Block :title="t('settings.interface.title')">
        <div class="flex flex-col gap-4">
          <Section
            :title="t('settings.interface.interface_language')"
          >
            <div class="flex flex-col gap-1">
              <div class="w-52">
                <UILanguageSelector />
              </div>
              <div>
                <Text
                  color="secondary"
                  size="xs"
                >
                  {{ t('settings.interface.interface_language_desc') }}
                </Text>
              </div>
            </div>
          </Section>
        </div>
      </Block>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { useCountdown } from '@vueuse/core'
import { onMounted, ref, toRef, watch } from 'vue'

import IconRedirectToOllama from '@/assets/icons/redirect-to-ollama.svg?component'
import Checkbox from '@/components/Checkbox.vue'
import Input from '@/components/Input.vue'
import Loading from '@/components/Loading.vue'
import Modal from '@/components/Modal.vue'
import ScrollTarget from '@/components/ScrollTarget.vue'
import Button from '@/components/ui/Button.vue'
import Text from '@/components/ui/Text.vue'
import UILanguageSelector from '@/components/UILanguageSelector.vue'
import WarningMessage from '@/components/WarningMessage.vue'
import { useValueGuard } from '@/composables/useValueGuard'
import { MIN_CONTEXT_WINDOW_SIZE } from '@/utils/constants'
// Ollama constants removed - no longer supporting local LLMs
// OLLAMA_HOMEPAGE_URL, OLLAMA_SEARCH_URL, OLLAMA_TUTORIAL_URL
import { useI18n } from '@/utils/i18n/index'
import logger from '@/utils/logger'
import { useOllamaStatusStore } from '@/utils/pinia-store/store'
import { useOpenRouterStore } from '@/utils/pinia-store/openrouter-store'
import { settings2bRpc } from '@/utils/rpc'
import { getUserConfig } from '@/utils/user-config'

import { useSettingsInitialQuery } from '../../composables/useQuery'
import Block from '../Block.vue'
import BlockTitle from '../BlockTitle.vue'
// import DownloadConfirmModal from '../OllamaDownloadModal.vue' // Removed - no longer supporting Ollama
import SavedMessage from '../SavedMessage.vue'
import Section from '../Section.vue'
// import DownloadWebLLMModel from '../WebLLMDownloadModal.vue' // Removed - no longer supporting WebLLM
// import RunningModels from './RunningModels/index.vue' // Removed - no longer supporting Ollama

const log = logger.child('Settings')

const { t } = useI18n()
const ollamaStatusStore = useOllamaStatusStore()
const { setValidated: setOpenRouterValidated } = useOpenRouterStore()

const settingsQuery = useSettingsInitialQuery()
const settingsRef = ref<HTMLElement | null>(null)
const userConfig = await getUserConfig()
const baseUrl = userConfig.llm.baseUrl.toRef()
const apiKey = userConfig.llm.apiKey.toRef()
const endpointType = userConfig.llm.endpointType.toRef()
const loading = ref(false)
const isShowDownloadWebLLMModal = ref(false)
const connectionStatus = toRef(ollamaStatusStore, 'connectionStatus')
const isShowDownloadOllamaModal = ref(settingsQuery.downloadModel.hasValue())

// API Validation state
const validationLoading = ref(false)
const validationStatus = ref<'valid' | 'invalid' | 'no-credits' | null>(null)
const validationError = ref('')
const modelCount = ref(0)
// Prompt refs
const translationSystemPrompt = userConfig.translation.systemPrompt.toRef()
const translationSystemPromptError = ref('')

const { value: numCtx, guardedValue: guardedNumCtx, errorMessage: numCtxError } = useValueGuard(userConfig.llm.numCtx.toRef(), (value) => {
  return {
    isValid: value >= MIN_CONTEXT_WINDOW_SIZE,
    errorMessage: t('settings.ollama.context_window_size_error', { min: MIN_CONTEXT_WINDOW_SIZE }),
  }
})
const enableNumCtx = userConfig.llm.enableNumCtx.toRef()

watch(() => settingsQuery.downloadModel.value, (v) => {
  if (v) isShowDownloadOllamaModal.value = true
})

// Ensure base URL is always set to OpenRouter
watch(endpointType, () => {
  if (baseUrl.value !== 'https://openrouter.ai/api/v1') {
    baseUrl.value = 'https://openrouter.ai/api/v1'
  }
})
const onDownloadOllamaModelFinished = async () => {
  await ollamaStatusStore.updateModelList()
  // remove the value to avoid open modal in next navigation
  settingsQuery.downloadModel.remove()
  isShowDownloadOllamaModal.value = false
}

// onDownloadWebLLMModelFinished removed - no longer supporting WebLLM
// const onDownloadWebLLMModelFinished = async (_model: string) => {
//   endpointType.value = 'web-llm'
//   isShowDownloadWebLLMModal.value = false
// }

const testConnection = async () => {
  loading.value = true
  try {
    await reScanOllama()
    const success = await ollamaStatusStore.updateConnectionStatus()
    if (success) {
      await ollamaStatusStore.updateModelList()
    }
    return success
  }
  catch (error) {
    log.error('Error testing connection:', error)
    return false
  }
  finally {
    loading.value = false
  }
}

const { start: startCheckConnection, stop: stopCheckConnection, remaining: checkSignal } = useCountdown(600, { interval: 2000 })

watch(checkSignal, (val) => {
  if (val) reScanOllama()
})

const onClickInstall = () => {
  startCheckConnection()
}

// API Key Validation
const validateApiKey = async () => {
  if (!apiKey.value) return
  
  validationLoading.value = true
  validationStatus.value = null
  validationError.value = ''
  modelCount.value = 0
  
  try {
    // Use the dedicated validation function that doesn't use fallbacks
    const response = await settings2bRpc.validateOpenRouterApiKey()
    
    if (response.valid) {
      validationStatus.value = 'valid'
      modelCount.value = response.modelCount
      log.info('API key validation successful:', response.modelCount, 'models available')
      
      // Set validation in store (this will trigger timestamp update)
      setOpenRouterValidated(true)
      
      // Clear cache first
      try {
        await settings2bRpc.clearOpenRouterModelsCache()
      } catch (cacheError) {
        log.warn('Failed to clear cache, but validation succeeded:', cacheError)
      }
      
      // Notify components (fire and forget - don't wait for it)
      settings2bRpc.notifyApiKeyValidated().catch((notifyError) => {
        log.warn('Failed to notify components, but validation succeeded:', notifyError)
      })
    } else {
      // Handle specific error types
      const errorMessage = response.error || '❌ Unable to validate API key. Please try again!'
      
      if (errorMessage.includes('insufficient credits') || errorMessage.includes('402')) {
        validationStatus.value = 'no-credits'
      } else {
        validationStatus.value = 'invalid'
        validationError.value = errorMessage
      }
    }
  } catch (error: any) {
    log.error('API key validation failed:', error)
    validationStatus.value = 'invalid'
    validationError.value = error.message || '❌ Unable to validate API key. Please try again!'
  } finally {
    validationLoading.value = false
  }
}

// Watch API key changes to reset validation status
watch(apiKey, () => {
  if (validationStatus.value) {
    validationStatus.value = null
    validationError.value = ''
    modelCount.value = 0
  }
})

// setupOllama removed - no longer supporting Ollama
// const setupOllama = async () => {
//   endpointType.value = 'ollama'
//   const success = await ollamaStatusStore.updateConnectionStatus()
//   await ollamaStatusStore.updateModelList()
//   if (success) {
//     stopCheckConnection()
//   }
// }

const reScanOllama = async () => {
  // Renamed to reScanOllama but now tests OpenRouter connection
  const success = await ollamaStatusStore.updateConnectionStatus()
  log.info('OpenRouter connection test result:', success)
  if (success) {
    // endpointType is already 'openrouter' - no need to change
    stopCheckConnection()
  }
}

watch(translationSystemPrompt, (newValue) => {
  if (!/\{\{LANGUAGE\}\}/.test(newValue)) {
    translationSystemPromptError.value = 'system prompt must contain {{LANGUAGE}}'
  }
  else {
    translationSystemPromptError.value = ''
  }
})

watch(baseUrl, (newValue) => {
  try {
    // if using server, reset numCtx to 8k and enableNumCtx to true
    const url = new URL(newValue)
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (!isLocalhost) {
      userConfig.llm.numCtx.resetDefault()
      userConfig.llm.enableNumCtx.set(true)
    }
  }
  catch {
    // avoid error when baseUrl is not a valid url
  }
})

onMounted(async () => {
  testConnection()
})
</script>
