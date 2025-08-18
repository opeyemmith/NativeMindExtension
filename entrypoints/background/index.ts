import '@/utils/polyfill'
import '@/utils/rpc'

import { browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'

import { INVALID_URLS } from '@/utils/constants'
import { CONTEXT_MENU, CONTEXT_MENU_ITEM_TRANSLATE_PAGE, ContextMenuId, ContextMenuManager } from '@/utils/context-menu'
import { useGlobalI18n } from '@/utils/i18n'
import logger from '@/utils/logger'
import { b2sRpc, bgBroadcastRpc } from '@/utils/rpc'
import { registerTabStoreCleanupListener } from '@/utils/tab-store'
import { registerDeclarativeNetRequestRule } from '@/utils/web-request'

import { waitForSidepanelLoaded } from './utils'

// Import the safe emit function
import { safeEmit } from '@/utils/rpc/background-fns'

export default defineBackground(() => {
  if (import.meta.env.CHROME) {
    browser.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
  }
  registerDeclarativeNetRequestRule()
  registerTabStoreCleanupListener()

  browser.action.setTitle({ title: 'NativeMind' })

  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

  browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    logger.info('tab removed', { tabId, removeInfo, isFirefox: import.meta.env.FIREFOX })
    bgBroadcastRpc.emit('tabRemoved', {
      tabId,
      ...removeInfo,
    })
  })

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only log significant changes to reduce console noise
    if (changeInfo.status === 'complete' || changeInfo.url) {
      logger.debug('tab updated', { tabId, changeInfo: Object.keys(changeInfo), url: tab.url })
    }

    // Only emit updates for meaningful changes (not loading states)
    if (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title || changeInfo.favIconUrl) {
      bgBroadcastRpc.emit('tabUpdated', {
        tabId,
        url: tab.url,
        title: tab.title,
        faviconUrl: tab.favIconUrl,
      })
    }
  })

  browser.runtime.onSuspend.addListener(() => {
    logger.debug('Extension is suspending')
  })

  if (import.meta.env.FIREFOX) {
    // In Chrome extensions, selection and page type context menus are mutually exclusive, so we don't need to handle onShown event
    // In Firefox, selection and page type context menus can coexist, so we need to handle onShown event
    // The logic here is: if the current context menu is selection type and text is selected, don't show the translate page context menu
    // If the current context menu is page type, show the translate page context menu
    // This prevents the translate page context menu from appearing when text is selected
    browser.menus.onShown.addListener(async (info) => {
      const shouldShowTranslateMenu = !(info.contexts.includes(browser.contextMenus.ContextType.SELECTION) && info.selectionText)
      const instance = await ContextMenuManager.getInstance()
      await instance.updateContextMenu(CONTEXT_MENU_ITEM_TRANSLATE_PAGE.id, {
        visible: shouldShowTranslateMenu,
      })
    })
  }

  browser.runtime.onInstalled.addListener(async () => {
    ContextMenuManager.getInstance().then(async (instance) => {
      const { t } = await useGlobalI18n()
      for (const menu of CONTEXT_MENU) {
        instance.createContextMenu(menu.id, {
          title: t(menu.titleKey),
          contexts: menu.contexts,
        })
      }
    })
    logger.debug('Extension Installed')
    // inject content script into all tabs which are opened before the extension is installed
    const tabs = await browser.tabs.query({})
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        const tabUrl = tab.url
        if (INVALID_URLS.some((regex) => regex.test(tabUrl))) continue
        await browser.scripting.executeScript({
          files: ['/content-scripts/content.js'],
          target: { tabId: tab.id },
          world: 'ISOLATED',
        }).then(() => {
          logger.info('Content script injected', { tabId: tab.id })
        }).catch((error) => {
          logger.error('Failed to inject content script', { tabId: tab.id, error })
        })
      }
    }
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    logger.debug('context menu clicked', info, tab)
    if (tab?.id) {
      if (typeof info.menuItemId === 'string' && ['quick-actions', 'add-image-to-chat'].some((id) => info.menuItemId.toString().includes(id))) {
        await browser.sidePanel.open({ windowId: tab.windowId })
        await waitForSidepanelLoaded()
        
        // Use the non-blocking safeEmit pattern from background-fns.ts
        safeEmit('contextMenuClicked', { ...info, menuItemId: info.menuItemId as ContextMenuId })
          .catch(() => {}); // Extra catch to ensure no uncaught promises
      }
      else {
        bgBroadcastRpc.emit('contextMenuClicked', {
          _toTab: tab?.id,
          ...info,
        })
      }
    }
  })

  logger.info('Hello from background!', { id: browser.runtime.id })
})
