<template>
  <div class="flex items-center gap-2">
    <input
      v-model="checked"
      type="checkbox"
      :checked="modelValue"
      class="cursor-pointer"
      :class="classNames(disabled ? 'pointer-events-none opacity-50' : '')"
    >
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'

import { classNames, type ComponentClassAttr } from '@/utils/vue/utils'

const props = defineProps<{
  modelValue: boolean
  class?: ComponentClassAttr
  disabled?: boolean
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const checked = useVModel(props, 'modelValue', emit)
</script>
