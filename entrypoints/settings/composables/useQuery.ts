import { ref } from 'vue'
import { LocationQuery, useRoute, useRouter } from 'vue-router'

import { lazyInitialize } from '@/utils/memo'
import { SettingsScrollTarget } from '@/utils/scroll-targets'

function getFirst<T>(value: T | T[]) {
  return Array.isArray(value) ? value[0] : value
}

export const useSettingsInitialQuery = lazyInitialize(() => {
  const router = useRouter()
  const route = useRoute()
  const scrollTarget = ref<SettingsScrollTarget>()
  const downloadModel = ref<string>()

  const update = (query: LocationQuery): LocationQuery | undefined => {
    const scrollTargetValue = getFirst(query['scrollTarget']) as SettingsScrollTarget
    const downloadModelValue = getFirst(query['downloadModel']) as string
    if (scrollTargetValue) {
      scrollTarget.value = scrollTargetValue
    }
    if (downloadModelValue) {
      downloadModel.value = downloadModelValue
    }
    if (query['scrollTarget'] || query['downloadModel']) {
      delete query['scrollTarget']
      delete query['downloadModel']
      return query
    }
  }

  const newQuery = update(route.query)
  if (newQuery) {
    router.isReady().then(() => {
      router.replace({ query: newQuery, force: true })
    })
  }

  router.beforeEach(async (to) => {
    const newQuery = update(to.query)
    if (newQuery) {
      return {
        ...to,
        query: newQuery,
      }
    }
  })

  return {
    scrollTarget,
    downloadModel,
  }
})
