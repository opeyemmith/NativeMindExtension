<template>
  <Teleport
    v-if="enableWritingTools"
    to="body"
  >
    <ShadowRootComponent
      ref="shadowRootRef"
      :adoptedStyleSheets="styleSheet ? [styleSheet] : []"
    >
      <div
        ref="containerRef"
        class="nativemind-writing-tools nativemind-style-boundary"
        :style="{'all': 'initial', position: 'fixed', top: '0', left: '0', width: '0px', height: '0px', zIndex: 'calc(Infinity)'}"
      >
        <div class="container bg-white text-black font-inter">
          <EditableEntry
            v-for="(el, idx) in elements"
            :key="idx"
            :editableElement="el"
          />
        </div>
      </div>
    </ShadowRootComponent>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import { ShadowRoot as ShadowRootComponent } from 'vue-shadow-dom'

import { useFocusedElements } from '@/composables/useObserverElements'
import { loadContentScriptStyleSheet } from '@/utils/css'
import logger from '@/utils/logger'
import { getUserConfig } from '@/utils/user-config'

import EditableEntry from './EditableEntry.vue'

const styleSheet = shallowRef<CSSStyleSheet | null>(null)
const shadowRootRef = ref<ShadowRoot | null>(null)
const userConfig = await getUserConfig()
const enableWritingTools = userConfig.writingTools.enable.toRef()
const { elements, start, stop } = useFocusedElements((el) => {
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName === 'INPUT') {
    const inputEl = el as HTMLInputElement
    const SUPPORTED_TYPES = ['text', 'search', 'url', 'tel']
    return SUPPORTED_TYPES.includes(inputEl.type) && !inputEl.disabled && !inputEl.readOnly
  }
  return !!el.closest('[contenteditable]') || el.hasAttribute('contenteditable') || el.isContentEditable
})

onMounted(async () => {
  styleSheet.value = await loadContentScriptStyleSheet(import.meta.env.ENTRYPOINT)
})

watch(elements, (newElements) => {
  logger.debug('Focused elements updated:', newElements)
})

watch(enableWritingTools, (enable) => {
  if (enable) {
    start()
    logger.info('Writing tools enabled')
  }
  else {
    stop()
    logger.info('Writing tools disabled')
  }
}, { immediate: true })
</script>
