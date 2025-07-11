export type TabInfo = {
  tabId: number
  title?: string
  url: string
  faviconUrl?: string
}

export type TabContent = TabInfo & {
  textContent: string
}
