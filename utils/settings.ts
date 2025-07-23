import { Browser, browser } from 'wxt/browser'

import { SettingsScrollTarget } from '@/utils/scroll-targets'

import { SETTINGS_PAGE_WINDOW_HEIGHT, SETTINGS_PAGE_WINDOW_WIDTH } from './constants'

interface Options {
  open?: boolean | ((open: boolean) => boolean)
  scrollTarget?: SettingsScrollTarget
  downloadModel?: string
}

let windowHandle: Browser.windows.Window | undefined

// all settings status operation should be done through this function instead of directly modifying the tabStore.showSetting.value
export async function showSettings(options?: Options) {
  const open = typeof options?.open === 'function' ? options.open(windowHandle !== undefined) : options?.open ?? true
  const windowId = windowHandle?.id
  const hasOpen = !!(windowId && await browser.windows.get(windowId).catch((_) => false))
  if (open) {
    if (!hasOpen) {
      const searchParams = new URLSearchParams()
      Object.entries(options ?? {}).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, value.toString())
        }
      })
      const left = (window.screen.availWidth - SETTINGS_PAGE_WINDOW_WIDTH) / 2 + (window.screen.availLeft ?? 0)
      const top = (window.screen.availHeight - SETTINGS_PAGE_WINDOW_HEIGHT) / 2 + (window.screen.availTop ?? 0)
      const url = browser.runtime.getURL(`/settings.html${searchParams.toString() ? `?${searchParams.toString()}` : ''}`)
      windowHandle = await browser.windows.create({ url, type: 'popup', width: SETTINGS_PAGE_WINDOW_WIDTH, height: SETTINGS_PAGE_WINDOW_HEIGHT, left, top })
    }
    else {
      await browser.windows.update(windowId, { focused: true })
    }
  }
  else if (hasOpen) {
    await browser.windows.remove(windowId)
  }
}
