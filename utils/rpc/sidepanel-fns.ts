import { EventEmitter } from 'events'
import { Browser } from 'wxt/browser'

import type { ContextMenuId } from '../context-menu'
import { logger } from '../logger'

const eventEmitter = new EventEmitter()

export type Events = {
  toggleContainer(opts: { _toTab?: number, open?: boolean }): void
  summarizePage(): void
  tabUpdated(opts: { tabId: number, url?: string, faviconUrl?: string, title?: string }): void
  tabRemoved(opts: { tabId: number } & Browser.tabs.TabRemoveInfo): void
  contextMenuClicked(opts: { _toTab?: number } & Browser.contextMenus.OnClickData & { menuItemId: ContextMenuId }): void
}

export type EventKey = keyof Events

export function ping(_: { _toTab?: number }) {
  return 'pong'
}

export const sidepanelFunctions = {
  emit: <E extends keyof Events>(ev: E, ...args: Parameters<Events[E]>) => {
    eventEmitter.emit(ev, ...args)
  },
  ping,
} as const

export function registerSidepanelRpcEvent<E extends EventKey>(ev: E, fn: (...args: Parameters<Events[E]>) => void) {
  logger.debug('registering content script rpc event', ev)
  eventEmitter.on(ev, fn)
  return () => {
    eventEmitter.off(ev, fn)
  }
}
