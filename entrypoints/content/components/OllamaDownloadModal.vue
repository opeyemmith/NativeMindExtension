<template>
  <Modal
    v-if="mountPoint"
    :modelValue="true"
    class="p-4 rounded-md w-full flex flex-col gap-2"
    :class="[props.mountPoint === 'sidebar' ? 'absolute' : 'fixed']"
    :mountPoint="mountPoint"
    noCloseButton
    :fadeInAnimation="false"
  >
    <div class="bg-white py-4 px-6 rounded-md w-[340px] max-w-full flex flex-col gap-2 text-black text-xs">
      <div class="font-bold text-base">
        {{ `${pulling ? 'Downloading' : 'Download'} “${modelInfo.name}” model (${formatSize(modelInfo.size)})` }}
      </div>
      <div
        v-if="!pulling"
        class="text-gray-600 text-sm"
      >
        This model needs to be downloaded before use. The download may take a few minutes.
      </div>
      <div
        v-else
        class="text-gray-600 text-sm"
      >
        Your model is being downloaded. Please wait…
      </div>
      <div v-if="pulling && !pulling.error">
        <div class="flex gap-2 items-stretch flex-col">
          <ProgressBar :progress="pulling.completed / (pulling.total || 1)" />
          <div class="text-xs text-gray-500 flex justify-between items-center">
            <div>{{ formatSize(pulling.completed) }}</div>
            <div>{{ formatSize(pulling.total) }}</div>
          </div>
        </div>
      </div>
      <div v-if="pulling?.error">
        <div class="text-red-500 text-xs flex items-center gap-1">
          <IconWarning class="w-3 h-3" />
          <span>{{ pulling.error }}</span>
        </div>
      </div>
      <Divider class="mt-4 mb-2" />
      <div class="flex gap-2 items-center justify-end">
        <Button
          variant="secondary"
          class="p-2"
          @click="cancel"
        >
          Cancel
        </Button>
        <Button
          v-if="!pulling"
          variant="primary"
          class="p-2"
          @click="installModel"
        >
          Download
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import IconWarning from '@/assets/icons/warning.svg?component'
import Modal from '@/components/Modal.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import Button from '@/components/ui/Button.vue'
import Divider from '@/components/ui/Divider.vue'
import { useInjectContext } from '@/composables/useInjectContext'
import { formatSize } from '@/utils/formatter'
import { PREDEFINED_OLLAMA_MODELS } from '@/utils/llm/predefined-models'
import logger from '@/utils/logger'

import { useRootElement } from '../composables/useRootElement'
import { pullOllamaModel } from '../utils/llm'

const log = logger.child('OllamaDownloadConfirmModal')

const props = defineProps<{
  model: string
  mountPoint?: 'sidebar' | 'document'
}>()

const emit = defineEmits(['cancel', 'finished'])
const modelInfo = PREDEFINED_OLLAMA_MODELS.find((model) => model.id === props.model) || PREDEFINED_OLLAMA_MODELS[0]
const rootElement = useRootElement()
const sidebarContainerEl = useInjectContext('sideContainerEl').inject()

const mountPoint = computed(() => {
  return props.mountPoint === 'sidebar' ? sidebarContainerEl?.value : rootElement
})

const pulling = ref<{ modelId: string, total: number, completed: number, abort: () => void, status: string, error?: string }>()

const cancel = () => {
  pulling.value?.abort()
  emit('cancel')
}

const installModel = async () => {
  const abortController = new AbortController()
  pulling.value = {
    modelId: modelInfo.id,
    total: modelInfo.size,
    completed: 0,
    abort: () => abortController.abort(),
    status: 'pulling',
  }
  try {
    // if the total size of current model layer is less than 10MB, we don't show the progress
    const MIN_SIZE_DISPLAYED = 10 * 1024 * 1024 // 10 MB
    const pullingIter = pullOllamaModel(modelInfo.id, abortController.signal)
    for await (const progress of pullingIter) {
      if (abortController.signal.aborted) {
        pulling.value = undefined
        return
      }
      if (progress.total && progress.completed && progress.total >= MIN_SIZE_DISPLAYED) {
        pulling.value.total = progress.total
        pulling.value.completed = progress.completed
      }
      if (progress.status) {
        pulling.value.status = progress.status
      }
    }
    emit('finished')
  }
  catch (error: unknown) {
    log.debug('Error while pulling model:', error)
    if (pulling.value) {
      pulling.value.error = String(error)
    }
  }
}

onBeforeUnmount(() => {
  pulling.value?.abort()
})
</script>
