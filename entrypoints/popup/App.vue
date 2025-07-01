<script lang="ts" setup>
import { ref } from 'vue'
import { browser } from 'wxt/browser'

import { INVALID_URLS } from '@/utils/constants'
import { useI18n } from '@/utils/i18n'

const { t } = useI18n()
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
      {{ t('popup.reload_page') }}
    </div>
    <div v-else>
      {{ t('popup.page_not_supported') }}
    </div>
  </div>
</template>
