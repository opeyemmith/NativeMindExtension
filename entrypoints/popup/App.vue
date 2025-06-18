<script lang="ts" setup>
import { ref } from 'vue'
import { browser } from 'wxt/browser'

const isValidUrl = ref(false)
browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
  if (tabs.length === 1) {
    const tab = tabs[0]
    isValidUrl.value = /https?:\/\//.test(tab.url ?? '')
  }
})
</script>

<template>
  <div>
    <div v-if="isValidUrl">
      Please reload the page to use NativeMind
    </div>
    <div v-else>
      This page is not supported by NativeMind.
    </div>
  </div>
</template>
