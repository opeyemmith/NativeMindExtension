import { Browser, browser } from 'wxt/browser'

export type ContextMenuId = 'native-mind-page-translate' | 'native-mind-selection-translate' | 'native-mind-settings' | 'native-mind-quick-actions' | `native-mind-quick-actions-${number}`
const ContextType = browser.contextMenus.ContextType
type ContextTypeList = [Browser.contextMenus.ContextType, ...Browser.contextMenus.ContextType[]]

type ContextMenuItem = {
  id: ContextMenuId
  title: string
  contexts: ContextTypeList
}

export const CONTEXT_MENU: ContextMenuItem[] = [
  {
    id: 'native-mind-page-translate',
    title: 'NativeMind: Translate this page',
    contexts: [ContextType.PAGE],
  },
  {
    id: 'native-mind-selection-translate',
    title: 'NativeMind: Translate selected text',
    contexts: [ContextType.SELECTION],
  },
  {
    id: 'native-mind-settings',
    title: 'Settings',
    contexts: [ContextType.ACTION],
  },
  // {
  //   id: 'native-mind-selection-translate',
  //   title: 'NativeMind: Writing Tools',
  //   contexts: [ContextType.EDITABLE],
  // },
]

export type ContextMenu = typeof CONTEXT_MENU
