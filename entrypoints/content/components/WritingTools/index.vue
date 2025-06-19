<template>
  <Teleport
    v-if="enableWritingTools"
    to="body"
  >
    <ShadowRoot>
      <component
        :is="'style'"
        data-nativemind-writing-tools-style="true"
      >
        {{ inlineCss }}
      </component>
      <div
        ref="containerRef"
        class="nativemind-writing-tools nativemind-style-boundary"
        :style="{'all': 'initial', position: 'fixed', top: '0', left: '0', width: '0px', height: '0px', zIndex: 'calc(Infinity)'}"
      >
        <div class="container bg-white text-black">
          <EditableEntry
            v-for="(el, idx) in elements"
            :key="idx"
            :editableElement="el"
          />
        </div>
      </div>
    </ShadowRoot>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ShadowRoot } from 'vue-shadow-dom'

import { useObserveElements } from '@/composables/useObserverElements'
import logger from '@/utils/logger'
import { getUserConfig } from '@/utils/user-config'

import EditableEntry from './EditableEntry.vue'
import inlineCss from './style.css?inline'

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

watch(elements, (newElements) => {
  logger.debug('Writing tools elements updated:', newElements)
}, { immediate: true })
</script>
