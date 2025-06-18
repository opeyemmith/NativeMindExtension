import { parseDocument } from '@/utils/document-parser'
import { c2bRpc } from '@/utils/rpc'
import { getTabStore } from '@/utils/tab-store'

export type TabInfo = {
  tabId: number
  title?: string
  url: string
  faviconUrl?: string
}

export type TabContent = TabInfo & {
  textContent: string
}

export async function getValidTabs(): Promise<TabInfo[]> {
  const tabs = await c2bRpc.getAllTabs()
  return tabs.filter((tab) => tab.url?.startsWith('http') && tab.tabId) as TabInfo[]
}

export async function getTabInfo(tabId: number) {
  const tabInfo = await c2bRpc.getTabInfo({ tabId })
  return tabInfo
}

export async function getDocumentContentOfTabs(tabIds: number[]) {
  const contents = await Promise.all(tabIds.map((tabId) => c2bRpc.getDocumentContentOfTab(tabId)))
  return contents
}

export async function getCurrentTabInfo(): Promise<TabInfo> {
  const tabStore = await getTabStore()
  const currentTabId = tabStore.currentTabId.value
  return getTabInfo(currentTabId)
}

export async function getCurrentDocumentContent(): Promise<TabContent> {
  const tabStore = await getTabStore()
  const currentTabId = tabStore.currentTabId.value
  return {
    tabId: currentTabId,
    title: document.title,
    url: window.location.href,
    faviconUrl: await getTabInfo(currentTabId).then((tab) => tab.faviconUrl),
    textContent: parseDocument(document)?.textContent || '',
  }
}
