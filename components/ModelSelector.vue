<template>
  <div
    class="flex justify-between items-center gap-3 relative"
    @click="onClick"
  >
    <!-- No API Key state -->
    <div
      v-if="!hasApiKey"
      :class="variant === 'compact' 
        ? 'flex items-center gap-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:bg-gray-100 transition-colors text-xs'
        : 'flex flex-col gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors'"
      @click="onConfigureApiKey"
    >
      <template v-if="variant === 'compact'">
        <span class="text-gray-700">{{ t('settings.models.no_api_key') }}</span>
        <IconRedirect class="w-3 h-3 text-blue-600" />
      </template>
      <template v-else>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-700">{{ t('settings.models.no_api_key') }}</span>
        </div>
        <div class="text-xs text-gray-500">
          {{ t('settings.models.no_api_key_desc') }}
        </div>
        <div class="flex items-center gap-1 text-xs text-blue-600 font-medium">
          <span>{{ t('settings.models.configure_api') }}</span>
          <IconRedirect class="w-3 h-3" />
        </div>
      </template>
    </div>

    <!-- API Key Not Validated state -->
    <div
      v-else-if="hasApiKey && !isApiValidated"
      :class="variant === 'compact' 
        ? 'flex items-center gap-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded cursor-pointer hover:bg-orange-100 transition-colors text-xs'
        : 'flex flex-col gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors'"
      @click="onConfigureApiKey"
    >
      <template v-if="variant === 'compact'">
        <span class="text-orange-800">⚠️ API key not validated</span>
        <IconRedirect class="w-3 h-3 text-orange-600" />
      </template>
      <template v-else>
        <div class="flex items-center gap-2">
          <span class="text-sm text-orange-800">⚠️ API key not validated</span>
        </div>
        <div class="text-xs text-orange-700">
          Please validate your API key in settings to access models
        </div>
        <div class="flex items-center gap-1 text-xs text-orange-600 font-medium">
          <span>Validate API Key</span>
          <IconRedirect class="w-3 h-3" />
        </div>
      </template>
    </div>

    <!-- Loading state for OpenRouter -->
    <div
      v-else-if="endpointType === 'openrouter' && openRouterLoading && modelList.length === 0"
      :class="variant === 'compact' 
        ? 'flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs'
        : 'flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg'"
    >
      <div :class="variant === 'compact' ? 'w-3 h-3' : 'w-4 h-4'" class="border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
      <span :class="variant === 'compact' ? 'text-blue-800' : 'text-sm text-blue-800'">{{ t('settings.models.loading_models') }}</span>
    </div>

    <!-- No Credits state for OpenRouter -->
    <div
      v-else-if="endpointType === 'openrouter' && openRouterStatus === 'no-credits' && modelList.length === 0"
      :class="variant === 'compact' 
        ? 'flex items-center gap-2 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded cursor-pointer hover:bg-yellow-100 transition-colors text-xs'
        : 'flex flex-col gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors'"
      @click="onAddCredits"
    >
      <template v-if="variant === 'compact'">
        <span class="text-yellow-800">{{ t('settings.models.no_credits') }}</span>
        <IconRedirect class="w-3 h-3 text-yellow-600" />
      </template>
      <template v-else>
        <div class="flex items-center gap-2">
          <span class="text-sm text-yellow-800">{{ t('settings.models.no_credits') }}</span>
        </div>
        <div class="text-xs text-yellow-700">
          {{ t('settings.models.no_credits_desc') }}
        </div>
        <div class="flex items-center gap-1 text-xs text-yellow-600 font-medium">
          <span>{{ t('settings.models.add_credits') }}</span>
          <IconRedirect class="w-3 h-3" />
        </div>
      </template>
    </div>

    <!-- Connection Error state for OpenRouter -->
    <div
      v-else-if="endpointType === 'openrouter' && openRouterStatus === 'error' && modelList.length === 0"
      :class="variant === 'compact' 
        ? 'flex items-center gap-2 px-2 py-1 bg-red-50 border border-red-200 rounded cursor-pointer hover:bg-red-100 transition-colors text-xs'
        : 'flex flex-col gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors'"
      @click="onConfigureApiKey"
    >
      <template v-if="variant === 'compact'">
        <span class="text-red-800">{{ t('settings.models.connection_error') }}</span>
        <IconRedirect class="w-3 h-3 text-red-600" />
      </template>
      <template v-else>
        <div class="flex items-center gap-2">
          <span class="text-sm text-red-800">{{ t('settings.models.connection_error') }}</span>
        </div>
        <div class="text-xs text-red-700">
          {{ t('settings.models.connection_error_desc') }}
        </div>
        <div class="flex items-center gap-1 text-xs text-red-600 font-medium">
          <span>{{ t('settings.models.configure_api') }}</span>
          <IconRedirect class="w-3 h-3" />
        </div>
      </template>
    </div>

    <!-- Ollama discover more section removed - no longer supporting local LLMs -->
    <Selector
      v-else
      v-model="selectedModel"
      :options="filteredModelOptions"
      :placeholder="t('settings.models.no_model')"
      class="text-xs max-w-full"
      :disabled="modelList.length === 0"
      :dropdownClass="classNames('text-xs text-black w-52', dropdownClass)"
      :containerClass="classNames('max-w-full', containerClass)"
      :dropdownAlign="dropdownAlign"
    >
      <template #button="{ option }">
        <div
          v-if="option"
          class="flex items-center gap-[6px] min-w-0"
        >
          <ModelLogo
            :modelId="option.value"
            class="shrink-0 grow-0"
          />
          <span class="text-ellipsis overflow-hidden whitespace-nowrap">
            {{ option.label }}
          </span>
        </div>
        <div v-else>
          ⚠️ No model
        </div>
      </template>
      <template #option="{ option }">
        <div class="flex items-center gap-2 justify-between w-full">
          <div
            v-if="showDetails"
            class="flex items-center gap-[6px]"
          >
            <ModelLogo
              :modelId="option.value"
              class="shrink-0 grow-0"
            />
            <div>
              <div class="text-left wrap-anywhere">
                {{ option.label }}
              </div>
              <!-- Size info removed - not available for cloud providers -->
            </div>
          </div>
          <div v-else>
            <div class="flex items-center gap-[6px]">
              <ModelLogo
                :modelId="option.value"
                class="shrink-0 grow-0"
              />
              <div class="text-left wrap-anywhere">
                {{ option.label }}
              </div>
            </div>
          </div>
          <IconDelete
            v-if="allowDelete"
            class="w-3 h-3 hover:text-red-400 cursor-pointer shrink-0 grow-0"
            @click="onClickDelete(option.value)"
          />
        </div>
      </template>
      <template #bottom>
        <div class="border-t border-gray-200 p-2">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('settings.models.search_models')"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @click.stop
          />
        </div>
      </template>
      <!-- Discover more section removed - no longer supporting local model discovery -->
    </Selector>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue'

import IconDelete from '@/assets/icons/delete.svg?component'
import IconOllamaRedirect from '@/assets/icons/ollama-redirect.svg?component'
import IconRedirect from '@/assets/icons/redirect.svg?component'
import ModelLogo from '@/components/ModelLogo.vue'
// import { OLLAMA_SEARCH_URL } from '@/utils/constants' // Removed - no longer supporting Ollama
import { formatSize } from '@/utils/formatter'
import { useI18n } from '@/utils/i18n'
// import { PREDEFINED_OPENROUTER_MODELS } from '@/utils/llm/predefined-models'
// import { SUPPORTED_MODELS } from '@/utils/llm/web-llm' // Removed - no longer supporting WebLLM
import { useOpenRouterStore } from '@/utils/pinia-store/openrouter-store'
import { registerSidepanelRpcEvent } from '@/utils/rpc/sidepanel-fns'
import { only } from '@/utils/runtime'
import { showSettings } from '@/utils/settings'
import { getUserConfig } from '@/utils/user-config'
import { classNames } from '@/utils/vue/utils'

import Selector from './Selector.vue'
import Button from './ui/Button.vue'
import Divider from './ui/Divider.vue'
import Text from './ui/Text.vue'

const props = withDefaults(defineProps<{
  modelType?: 'chat' | 'translation'
  showDetails?: boolean
  allowDelete?: boolean
  dropdownAlign?: 'left' | 'center' | 'right' | 'stretch' | undefined
  containerClass?: string
  dropdownClass?: string
  variant?: 'default' | 'compact'
  onDeleteModel?: (model: string) => Promise<void>
}>(), {
  modelType: 'chat',
  variant: 'default',
})

const { t } = useI18n()

// OpenRouter store
const {
  modelList: openRouterModelList,
  isLoading: openRouterLoading,
  connectionStatus: openRouterStatus,
  isValidated: openRouterValidated,
  lastValidatedAt: openRouterLastValidatedAt,
} = toRefs(useOpenRouterStore())
const { updateModelList: updateOpenRouterModelList, clearValidation: clearOpenRouterValidation, setValidated: setOpenRouterValidated } = useOpenRouterStore()

// Local search query for filtering models
const searchQuery = ref('')

only(['sidepanel'], () => {
  const removeListener = registerSidepanelRpcEvent('updateModelList', async () => await updateOpenRouterModelList())
  onBeforeUnmount(() => removeListener())
})

const modelList = computed(() => {
  // Only OpenRouter is supported now
  if (endpointType.value === 'openrouter') {
    return openRouterModelList.value.map((model) => ({
      name: model.name,
      model: model.model,
      description: model.description,
      pricing: model.pricing,
      contextLength: model.contextLength,
      provider: model.provider,
    }))
  }
  // Fallback for any unsupported endpoint types
  return []
})

const updateModelList = async () => {
  // Only OpenRouter is supported now
  if (endpointType.value === 'openrouter') {
    await updateOpenRouterModelList()
  }
}

defineExpose({
  updateModelList,
})

const userConfig = await getUserConfig()
const baseUrl = userConfig.llm.baseUrl.toRef()
const apiKey = userConfig.llm.apiKey.toRef()
const commonModel = userConfig.llm.model.toRef()
const translationModel = userConfig.translation.model.toRef()
const selectedModel = computed({
  get() {
    if (props.modelType === 'chat' || translationModel.value === undefined) return commonModel.value
    else return translationModel.value
  },
  set(value) {
    if (props.modelType === 'chat') commonModel.value = value
    else translationModel.value = value
  },
})
const endpointType = userConfig.llm.endpointType.toRef()

// Check if API key is configured
const hasApiKey = computed(() => {
  return apiKey.value && apiKey.value.trim().length > 0
})

// Check if API key is validated
const isApiValidated = computed(() => {
  return hasApiKey.value && openRouterValidated.value
})

const modelOptions = computed(() => {
  return modelList.value.map((model) => ({
    id: model.model,
    label: model.name,
    value: model.model,
    // Store additional info for search filtering
    searchText: `${model.name} ${model.model} ${model.description || ''} ${model.provider || ''}`.toLowerCase(),
  }))
})

const filteredModelOptions = computed(() => {
  if (!searchQuery.value.trim()) {
    return modelOptions.value
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  return modelOptions.value.filter((option) => 
    option.searchText.includes(query)
  )
})

const onClickDelete = async (model: string) => {
  await props.onDeleteModel?.(model)
  await updateModelList()
}

const onClick = () => {
  if (modelList.value.length === 0) {
    showSettings({ scrollTarget: 'model-download-section' })
  }
}

const onConfigureApiKey = () => {
  showSettings({ scrollTarget: 'openrouter-config-section' })
}

const onAddCredits = () => {
  // Open OpenRouter credits page
  window.open('https://openrouter.ai/credits', '_blank')
}

watch(modelList, (modelList) => {
  if (modelList.length === 0) {
    commonModel.value = undefined
    translationModel.value = undefined
    return
  }
  const newTranslationModel = modelList.find((m: any) => m.model === translationModel.value) ?? modelList[0] ?? undefined
  const newCommonModel = modelList.find((m: any) => m.model === commonModel.value) ?? modelList[0] ?? undefined
  translationModel.value = newTranslationModel.model
  commonModel.value = newCommonModel.model
})

watch([baseUrl, endpointType, selectedModel, apiKey], async () => {
  if (hasApiKey.value && isApiValidated.value) {
    updateModelList()
  }
})

// Watch for validation timestamp changes (more reliable than events)
watch(openRouterLastValidatedAt, async (newTimestamp, oldTimestamp) => {
  if (newTimestamp > oldTimestamp && hasApiKey.value) {
    console.log('API key validation timestamp updated, fetching models')
    await updateModelList()
  }
})

// Clear validation when API key changes
watch(apiKey, () => {
  if (openRouterValidated.value) {
    clearOpenRouterValidation()
  }
})

onMounted(async () => {
  if (hasApiKey.value && isApiValidated.value) {
    updateModelList()
  }
})

// Listen for model list update events from settings (which includes API key validation)
only(['sidepanel'], () => {
  // We already have updateModelList listener above, so we can remove this duplicate
  // The existing listener on line 255 handles model updates including after API validation
})
</script>
