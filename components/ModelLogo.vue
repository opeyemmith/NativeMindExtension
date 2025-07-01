<template>
  <div class="flex items-center justify-center w-4 h-4 rounded-full border border-[#0000000D] bg-white">
    <component
      :is="iconComponent"
      class="w-[10px] h-[10px]"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { getModelLogoComponent } from '@/utils/llm/model-logos'

const props = defineProps<{
  modelId: string
}>()

const iconComponent = computed(() => {
  return getModelLogoComponent(props.modelId)
})
</script>
