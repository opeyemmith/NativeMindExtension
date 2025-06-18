<script lang="ts" setup>
import { ref } from 'vue'
import { browser } from 'wxt/browser'

import { INVALID_URLS } from '@/utils/constants'

const isValidUrl = ref(false)
browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
  if (tabs.length === 1) {
    const tab = tabs[0]
    const { url } = tab || {}
    isValidUrl.value = !!url && /https?:\/\//.test(url) && !INVALID_URLS.some((regexp) => regexp.test(url))
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
