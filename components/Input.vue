<template>
  <input
    v-model="inputValue"
    :class="classNames('relative focus:shadow-[0px_0px_0px_1px_#24B960] rounded-[6px] shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_0px_rgba(0,0,0,0.12)] p-2 outline-none', props.class)"
  >
</template>
<script setup lang="tsx">
import { useVModel } from '@vueuse/core'

import { classNames, type ComponentClassAttr } from '@/utils/vue/utils'

const props = defineProps<{
  modelValue: string | number
  class?: ComponentClassAttr
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const inputValue = useVModel(props, 'modelValue', emit, {
  passive: true,
  eventName: 'update:modelValue',
})
</script>
