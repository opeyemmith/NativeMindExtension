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

import { useObserveElements } from '@/composables/useObserverElements'
import { loadContentScriptStyleSheet } from '@/utils/css'
import logger from '@/utils/logger'
import { getUserConfig } from '@/utils/user-config'

import EditableEntry from './EditableEntry.vue'

const styleSheet = shallowRef<CSSStyleSheet | null>(null)
const shadowRootRef = ref<ShadowRoot | null>(null)
const userConfig = await getUserConfig()
const enableWritingTools = userConfig.writingTools.enable.toRef()
const initialElements = [...document.querySelectorAll('textarea, input:not([type="hidden"]), [contenteditable]')] as HTMLElement[]
const { elements } = enableWritingTools.value
  ? useObserveElements((el) => {
      if (el.tagName === 'TEXTAREA') return true
      if (el.tagName === 'INPUT') {
        const inputEl = el as HTMLInputElement
        return inputEl.type !== 'hidden' && inputEl.type !== 'file' && inputEl.type !== 'button' && inputEl.type !== 'submit'
      }
      return !!el.getAttribute('contenteditable')
    }, initialElements as HTMLElement[])
  : { elements: ref([]) }

onMounted(async () => {
  if (enableWritingTools.value && shadowRootRef.value) {
    styleSheet.value = await loadContentScriptStyleSheet(import.meta.env.ENTRYPOINT)
  }
})

watch(elements, (newElements) => {
  logger.debug('Writing tools elements updated:', newElements)
}, { immediate: true })
</script>
