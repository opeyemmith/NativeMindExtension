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
import { nextTick, ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'input', ev: Event): void
  (e: 'update:modelValue', value: string): void
}>()

const props = defineProps<{
  modelValue?: string
  minHeight?: number
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const inputValue = useVModel(props, 'modelValue', emit, {
  eventName: 'update:modelValue',
})

watch(inputValue, async () => {
  await nextTick()
  const textarea = textareaRef.value as HTMLTextAreaElement
  if (!textarea) return
  textarea.style.height = '0px' // Reset height to auto to shrink if needed
  // force a reflow to ensure the height is recalculated
  const _ = textarea.offsetHeight
  const scrollHeight = textarea.scrollHeight
  const height = Math.max(props.minHeight || 0, scrollHeight)
  textarea.style.height = `${height}px` // Set height to scrollHeight to expand
})

const onInput = (event: Event) => {
  emit('input', event)
}
</script>
