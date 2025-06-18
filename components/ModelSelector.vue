<template>
  <div
    class="flex justify-between items-center gap-3 relative"
    @click="onClick"
  >
    <Selector
      v-model="selectedModel"
      :options="modelOptions"
      placeholder="⚠️ No model"
      class="text-xs max-w-full"
      :disabled="modelList.length === 0"
      dropdownClass="text-xs text-black w-52"
      containerClass="max-w-full"
      :dropdownAlign="dropdownAlign"
    >
      <template #button="{ option }">
        <div
          v-if="option"
          class="flex items-center gap-[6px] min-w-0"
        >
          <ModelLogo
            :modelId="option.model.model"
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
            <ModelLogo :modelId="option.model.model" />
            <div>
              <div class="text-left wrap-anywhere">
                {{ option.label }}
              </div>
              <div
                v-if="option.model.size || option.model.size_vram"
                class="text-gray-500 text-[8px] flex items-center font-light"
              >
                <div v-if="option.model.size_vram">
                  {{ formatSize(option.model.size_vram) }} (vram)
                </div>
                <div v-else-if="option.model.size">
                  {{ formatSize(option.model.size) }}
                </div>
              </div>
            </div>
          </div>
          <div v-else>
            <div class="flex items-center gap-[6px]">
              <ModelLogo :modelId="option.model.model" />
              <div class="text-left wrap-anywhere">
                {{ option.label }}
              </div>
            </div>
          </div>
          <IconDelete
            v-if="allowDelete"
            class="w-3 h-3 hover:text-red-400 cursor-pointer"
            @click="onClickDelete(option.model.model)"
          />
        </div>
      </template>
    </Selector>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, toRefs, watch } from 'vue'

import IconDelete from '@/assets/icons/delete.svg?component'
import ModelLogo from '@/components/ModelLogo.vue'
import { useOllamaStatusStore } from '@/entrypoints/content/store'
import { deleteOllamaModel } from '@/entrypoints/content/utils/llm'
import { formatSize } from '@/utils/formatter'
import { SUPPORTED_MODELS } from '@/utils/llm/web-llm'
import { getTabStore } from '@/utils/tab-store'
import { getUserConfig } from '@/utils/user-config'

import Selector from './Selector.vue'

defineProps<{
  showDetails?: boolean
  allowDelete?: boolean
  dropdownAlign?: 'left' | 'center' | 'right' | 'stretch' | undefined
}>()

const { modelList: ollamaModelList } = toRefs(useOllamaStatusStore())
const { updateModelList: updateOllamaModelList } = useOllamaStatusStore()

const modelList = computed(() => {
  if (endpointType.value === 'ollama') {
    return ollamaModelList.value
  }
  else {
    return SUPPORTED_MODELS.map((model) => ({
      name: model.name,
      model: model.modelId,
    }))
  }
})

const updateModelList = async () => {
  if (endpointType.value === 'ollama') {
    await updateOllamaModelList()
  }
}

defineExpose({
  updateModelList,
})

const userConfig = await getUserConfig()
const baseUrl = userConfig.llm.baseUrl.toRef()
const tabStore = await getTabStore()
const selectedModel = userConfig.llm.model.toRef()
const endpointType = userConfig.llm.endpointType.toRef()

const modelOptions = computed(() => {
  return modelList.value.map((model) => ({
    id: model.model,
    label: model.name,
    value: model.model,
    model: { size: undefined, size_vram: undefined, ...model },
  }))
})

const onClickDelete = async (model: string) => {
  await deleteOllamaModel(model)
  await updateModelList()
}

const onClick = () => {
  if (modelList.value.length === 0) {
    tabStore.showSetting.value = true
  }
}

watch(modelList, (modelList) => {
  if (modelList.length === 0) {
    selectedModel.value = ''
    return
  }
  const newSelectedModel = modelList.find((m) => m.model === selectedModel.value) ?? modelList[0]
  selectedModel.value = newSelectedModel.model
})

watch([baseUrl, endpointType], async () => {
  updateModelList()
})

onMounted(async () => {
  updateModelList()
})
</script>
