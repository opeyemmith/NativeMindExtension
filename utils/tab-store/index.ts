import { customRef, ref, toRaw, watch } from 'vue'
import { storage } from 'wxt/utils/storage'

import { TAB_STORE_STORAGE_KEY_PREFIX } from '../constants'
import { debounce } from '../debounce'
import { Base64ImageData } from '../image'
import { lazyInitialize } from '../memo'
import { c2bRpc } from '../rpc'
import type { SettingsScrollTarget } from '../scroll-targets'
import type { HistoryItemV1 } from './history'

export { HistoryItemV1 }

function constructStorageKey(tabId: number, key: string) {
  const scope = import.meta.env.FIREFOX
    ? 'local'
    : 'session'
  return `${scope}:${TAB_STORE_STORAGE_KEY_PREFIX}${tabId}-${key}` as `${'local' | 'session'}:${string}`
}

async function defineTabValue<T>(tabId: number, key: string, defaultValue: T) {
  const sessionKey = constructStorageKey(tabId, key)
  const valueInStorageStr = await storage.getItem<string>(sessionKey)
  const valueInStorage = valueInStorageStr ? JSON.parse(valueInStorageStr) : defaultValue
  const v = ref(valueInStorage)
  watch(
    v,
    () => debounceSetItem(),
    { deep: true },
  )

  const debounceSetItem = debounce(() => {
    storage.setItem(sessionKey, JSON.stringify(toRaw(v.value)))
  }, 1000)

  return customRef<T>((track, trigger) => {
    return {
      get() {
        track()
        return v.value
      },
      set(vv) {
        v.value = vv
        trigger()
      },
    }
  })
}

export type ChatHistory = HistoryItemV1[]

export type PageSummary = {
  content: string
  summary: string
  reasoning?: string
  reasoningTime?: number
  done: boolean
}

type ShowSettingsParams = { show: boolean, scrollTarget?: SettingsScrollTarget, downloadModel?: string }

async function _getTabStore() {
  const { tabId, faviconUrl, url, title } = await c2bRpc.getTabInfo()
  if (!tabId) throw new Error('no tab id')
  return {
    currentTabId: await defineTabValue(tabId, 'currentTabId', tabId),
    showContainer: await defineTabValue(tabId, `showContainer`, false),
    showSetting: await defineTabValue<ShowSettingsParams>(tabId, `showSetting`, { show: false }),
    chatHistory: await defineTabValue(tabId, `chatHistory`, [] as ChatHistory),
    pageSummary: await defineTabValue(tabId, `summary`, { content: '', summary: '' } as PageSummary),
    contextTabIds: await defineTabValue(tabId, `contextTabs`, [tabId] as number[]),
    contextImages: await defineTabValue(tabId, `contextImages`, [] as Base64ImageData[]),
    tabInfo: await defineTabValue(tabId, `tabInfo`, {
      url,
      title,
      faviconUrl,
    }),
  }
}

export const getTabStore = lazyInitialize(_getTabStore)

// this is a workaround for firefox to clear the tab store when the tab is closed
export const getTabKeys = (tabId: number) => {
  const keys = [
    'currentTabId',
    'showContainer',
    'showSetting',
    'chatHistory',
    'summary',
    'contextTabs',
    'contextImages',
    'tabInfo',
  ]
  return keys.map((key) => constructStorageKey(tabId, key))
}
