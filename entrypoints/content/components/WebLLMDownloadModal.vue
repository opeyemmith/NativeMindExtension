<template>
  <div class="bg-white text-black py-4 px-6 rounded-md max-w-full flex flex-col w-[340px] text-xs">
    <div class="font-bold text-base">
      {{ `${webLLMInitializeProgress.started ? 'Downloading' : 'Download'} “${DEFAULT_MODEL.name}” model (${formatSize(DEFAULT_MODEL.weightsBinSize)})` }}
    </div>
    <div
      v-if="!webLLMInitializeProgress.started"
      class="text-gray-600 text-sm"
    >
      To use Local mode, you need to download the {{ DEFAULT_MODEL.name }} model ({{ formatSize(DEFAULT_MODEL.weightsBinSize) }}). Would you like to download it
      now?
    </div>
    <div
      v-else
      class="text-gray-600 text-sm"
    >
      Your model is being downloaded. Please wait…
    </div>
    <div
      v-if="webLLMInitializeProgress.started"
      class="mt-6"
    >
      <ProgressBar :progress="webLLMInitializeProgress.downloaded / (webLLMInitializeProgress.total || 1)" />
      <div class="flex gap-2 items-stretch flex-col">
        <div class="text-[10px] text-gray-500 flex justify-between items-center">
          <div>{{ formatSize(webLLMInitializeProgress.downloaded) }}</div>
          <div>{{ formatSize(webLLMInitializeProgress.total) }}</div>
        </div>
      </div>
    </div>
    <Divider class="mt-6 mb-4" />
    <div class="flex gap-2 items-center justify-end">
      <Button
        variant="secondary"
        class="p-2"
        @click="cancel"
      >
        Cancel
      </Button>
      <Button
        v-if="!webLLMInitializeProgress.started"
        variant="primary"
        class="p-2"
        :class="{ 'opacity-50 pointer-events-none': !supportedWebLLM.supported }"
        @click="initWebLLM"
      >
        Download
      </Button>
    </div>
    <div
      v-if="!supportedWebLLM.supported"
      class="text-red-500 text-[10px] flex items-center gap-2 justify-start"
    >
      <IconWarning class="w-3 h-3" />
      WebLLM not supported on your {{ supportedWebLLM.reason === 'browser' ? 'browser' : 'device' }}.
    </div>
  </div>
</template>
<script setup lang="ts">
import IconWarning from '@/assets/icons/warning.svg?component'
import ProgressBar from '@/components/ProgressBar.vue'
import Button from '@/components/ui/Button.vue'
import Divider from '@/components/ui/Divider.vue'
import { formatSize } from '@/utils/formatter'
import { SUPPORTED_MODELS, WebLLMSupportedModel } from '@/utils/llm/web-llm'
import { c2bRpc } from '@/utils/rpc'

import { initWebLLMEngine } from '../utils/llm'

const emit = defineEmits<{
  (e: 'canceled'): void
  (e: 'finished', model: WebLLMSupportedModel): void
}>()

const supportedWebLLM = await c2bRpc.checkSupportWebLLM()
const DEFAULT_MODEL = SUPPORTED_MODELS[0]
const webLLMInitializeProgress = ref({ total: DEFAULT_MODEL.weightsBinSize, downloaded: 0, started: false, done: false })
const cancel = () => {
  emit('canceled')
}

const initWebLLM = async () => {
  webLLMInitializeProgress.value.started = true
  const progressIter = initWebLLMEngine(DEFAULT_MODEL.modelId)
  for await (const progress of progressIter) {
    logger.debug('WebLLM model download progress', progress)
    if (progress.type === 'progress') {
      webLLMInitializeProgress.value.downloaded = progress.progress.progress * webLLMInitializeProgress.value.total
    }
  }
  webLLMInitializeProgress.value.done = true
  emit('finished', DEFAULT_MODEL.modelId)
}
</script>
