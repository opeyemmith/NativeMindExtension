<template>
  <textarea
    ref="textareaRef"
    v-model="inputValue"
    rows="1"
    class="field-sizing-content scrollbar-hide"
    @input="onInput"
  />
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'

const emit = defineEmits<{
  (e: 'input', ev: Event): void
  (e: 'update:modelValue', value: string): void
}>()

const props = defineProps<{
  modelValue?: string
}>()

const inputValue = useVModel(props, 'modelValue', emit, {
  passive: true,
  eventName: 'update:modelValue',
})

const onInput = (event: Event) => {
  emit('input', event)
  const textarea = event.target as HTMLTextAreaElement
  textarea.style.height = 'auto' // Reset height to auto to shrink if needed
  // force a reflow to ensure the height is recalculated
  const _ = textarea.offsetHeight
  const scrollHeight = textarea.scrollHeight
  textarea.style.height = `${scrollHeight}px` // Set height to scrollHeight to expand
}
</script>
