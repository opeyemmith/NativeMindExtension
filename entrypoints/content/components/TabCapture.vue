<template>
  <div>
    <img
      v-if="url"
      :src="url"
      class="object-cover w-full h-full"
    >
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { c2bRpc } from '@/utils/rpc'

const url = ref<string>()

const capture = async () => {
  url.value = await c2bRpc.captureVisibleTab()
}

defineExpose({
  capture,
})
</script>
