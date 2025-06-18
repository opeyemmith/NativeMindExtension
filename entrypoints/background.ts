import '@/utils/polyfill'
import '@/utils/rpc'

import { browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'

import { INVALID_URLS } from '@/utils/constants'
import { CONTEXT_MENU } from '@/utils/context-menu'
import logger from '@/utils/logger'
import { bgBroadcastRpc } from '@/utils/rpc'
import { isTabValid } from '@/utils/tab'
import { registerDeclarativeNetRequestRule } from '@/utils/web-request'

export default defineBackground(() => {
  if (import.meta.env.CHROME) {
    browser.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
  }
  registerDeclarativeNetRequestRule()

  const tabsWaitingForOpen = new Set<number>()

  browser.action.setTitle({ title: 'NativeMind' })

  browser.action.onClicked.addListener(async (tab) => {
    logger.info('onClicked', tab)
    if (tab.id) {
      const validTab = await isTabValid(tab.id)
      if (validTab) {
        tabsWaitingForOpen.delete(tab.id)
        await bgBroadcastRpc.emit('toggleContainer', { _toTab: tab.id })
      }
      else {
        tabsWaitingForOpen.add(tab.id)
      }
    }
  })

  const setPopupStatusBasedOnUrl = async (tabId: number, url: string) => {
    const isValidUrl = /https?:\/\//.test(url ?? '')
    if (!isValidUrl || unAttachedTabs.has(tabId) || INVALID_URLS.some((regex) => regex.test(url))) {
      await browser.action.setPopup({ popup: 'popup.html' })
    }
    else {
      if (tabsWaitingForOpen.has(tabId)) {
        tabsWaitingForOpen.delete(tabId)
        await bgBroadcastRpc.emit('toggleContainer', { _toTab: tabId, open: true })
      }
      await browser.action.setPopup({ popup: '' })
    }
  }

  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await browser.tabs.get(tabId)
    const url = tab.url
    url && (await setPopupStatusBasedOnUrl(tabId, url))
  })

  browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    logger.info('tab removed', { tabId })
    tabsWaitingForOpen.delete(tabId)
    bgBroadcastRpc.emit('tabRemoved', {
      tabId,
      ...removeInfo,
    })
  })

  browser.tabs.onUpdated.addListener(async (tabId, _changeInfo, tab) => {
    logger.info('tab updated', { tabId, changeInfo: _changeInfo, tab })
    unAttachedTabs.delete(tabId)
    if (tab.url) {
      await setPopupStatusBasedOnUrl(tabId, tab.url)
    }

    bgBroadcastRpc.emit('tabUpdated', {
      tabId,
      url: tab.url,
      title: tab.title,
      faviconUrl: tab.favIconUrl,
    })
  })

  const unAttachedTabs = new Set<number>()

  browser.runtime.onInstalled.addListener(async () => {
    logger.debug('Extension Installed')
    const tabs = await browser.tabs.query({ currentWindow: true })
    for (const tab of tabs) {
      tab.id && unAttachedTabs.add(tab.id)
    }
    await browser.contextMenus.removeAll()
    for (const menu of CONTEXT_MENU) {
      browser.contextMenus.create({
        id: menu.id,
        title: menu.title,
        contexts: menu.contexts,
      })
    }
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    logger.debug('context menu clicked', info, tab)
    if (tab?.id) {
      bgBroadcastRpc.emit('contextMenuClicked', {
        _toTab: tab?.id,
        ...info,
      })
    }
  })

  logger.info('Hello background!', { id: browser.runtime.id })
})
