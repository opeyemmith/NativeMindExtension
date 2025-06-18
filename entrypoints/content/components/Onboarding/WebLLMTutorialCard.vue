<template>
  <div
    class="p-6 flex flex-col gap-[10px] items-stretch bg-[#F2F2F2] rounded-lg m-[11px]"
  >
    <div class="text-[15px] font-semibold flex items-center gap-1">
      Not ready to install? Try it instantly.
    </div>
    <div class="text-[13px] text-center">
      <Text>
        Use a lightweight model (Qwen 0.6b)right in your browser — no setup, no wait.
      </Text>
    </div>
    <Modal
      v-model="isShowDownloadWebLLMModal"
      noCloseButton
      :closeByMask="false"
      :fadeInAnimation="false"
    >
      <DownloadWebLLMModel
        @finished="emit('installed')"
        @canceled="isShowDownloadWebLLMModal = false"
      />
    </Modal>
    <Button
      variant="secondary"
      class="shrink-0 grow-0 flex mt-1 items-center justify-center rounded-md gap-2 font-bold cursor-pointer h-7"
      :disabled="!supportWebLLM.supported"
      @click="initWebLLM"
    >
      <Text
        size="small"
        class="font-medium"
      >
        Start with Web Model
      </Text>
    </Button>
    <div
      v-if="!supportWebLLM.supported"
      class="text-red-500 text-[10px] flex items-center gap-2 justify-start"
    >
      <IconWarning class="w-3 h-3" />
      WebLLM not supported on your {{ supportWebLLM.reason === 'browser' ? 'browser' : 'device' }}.
    </div>
  </div>
</template>
<script setup lang="ts">
import IconWarning from '@/assets/icons/warning.svg?component'
import Modal from '@/components/Modal.vue'
import Button from '@/components/ui/Button.vue'
import Text from '@/components/ui/Text.vue'
import { c2bRpc } from '@/utils/rpc'

import DownloadWebLLMModel from '../WebLLMDownloadModal.vue'

const emit = defineEmits(['installed'])

const supportWebLLM = await c2bRpc.checkSupportWebLLM()

const isShowDownloadWebLLMModal = ref(false)

const initWebLLM = async () => {
  isShowDownloadWebLLMModal.value = true
}
</script>
