<template>
  <img
    v-if="dataUrl"
    data-nativemind-external-image
    :src="dataUrl"
    @error="onError"
  >
  <div v-else>
    <slot
      name="fallback"
    />
  </div>
</template>
<script lang="ts">
import { LRUCache } from 'lru-cache'
import { ref, watchEffect } from 'vue'
const imageCache = new LRUCache<string, string>({
  max: 50,
})
</script>
<script setup lang="ts">
import { c2bRpc } from '@/utils/rpc'

const props = defineProps<{
  src: string
}>()

const dataUrl = ref('')

const onError = () => {
  dataUrl.value = ''
}

watchEffect(async () => {
  const cached = imageCache.get(props.src)
  if (cached) {
    dataUrl.value = cached
    return
  }
  const r = await c2bRpc.fetchAsDataUrl(props.src)
  if ('dataUrl' in r) {
    dataUrl.value = r.dataUrl
  }
  else {
    dataUrl.value = props.src
  }
})
</script>
