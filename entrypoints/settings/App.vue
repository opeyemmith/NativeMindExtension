<script lang="ts" setup>
import { watchEffect } from 'vue'
import { computed } from 'vue'

import { usePageQuery } from '@/composables/usePageQuery'
import { useI18n } from '@/utils/i18n'
import { SettingsScrollTarget } from '@/utils/scroll-targets'

import Settings from './components/Settings/index.vue'

const { t } = useI18n()

watchEffect(() => {
  document.title = t('settings.title')
})

const pageQuery = usePageQuery()
const downloadModel = computed(() => pageQuery.value.downloadModel?.[0])
const scrollTarget = computed(() => pageQuery.value.scrollTarget?.[0] as SettingsScrollTarget | undefined)
</script>

<template>
  <Suspense>
    <div>
      <Settings
        :downloadModel="downloadModel"
        :scrollTarget="scrollTarget"
      />
    </div>
  </Suspense>
</template>

<style lang="scss">
html, body {
 min-width: 350px;
}
</style>
