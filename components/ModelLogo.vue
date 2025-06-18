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

import LogoCohere from '@/assets/icons/model-logo-cohere.svg?component'
import LogoDeepseek from '@/assets/icons/model-logo-deepseek.svg?component'
import LogoFallback from '@/assets/icons/model-logo-fallback.svg?component'
import LogoGemma from '@/assets/icons/model-logo-gemma.svg?component'
import LogoLlama from '@/assets/icons/model-logo-llama.svg?component'
import LogoLlava from '@/assets/icons/model-logo-llava.svg?component'
import LogoMistral from '@/assets/icons/model-logo-mistral.svg?component'
import LogoPhi from '@/assets/icons/model-logo-phi.svg?component'
import LogoQwen from '@/assets/icons/model-logo-qwen.svg?component'

const props = defineProps<{
  modelId: string
}>()

const matcher = [
  {
    match: /deepseek/i,
    component: LogoDeepseek,
  },
  {
    match: /gemma/i,
    component: LogoGemma,
  },
  {
    match: /qwen/i,
    component: LogoQwen,
  },
  {
    match: /llama/i,
    component: LogoLlama,
  },
  {
    match: /mistral/i,
    component: LogoMistral,
  },
  {
    match: /llava/i,
    component: LogoLlava,
  },
  {
    match: /phi/i,
    component: LogoPhi,
  },
  {
    match: /command|aya/i,
    component: LogoCohere,
  },
]

const iconComponent = computed(() => {
  const matched = matcher.find((item) => props.modelId.match(item.match))
  return matched ? matched.component : LogoFallback
})
</script>
