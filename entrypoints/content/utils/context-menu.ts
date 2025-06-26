import { watch } from 'vue'

import { getLanguageName, LanguageCode } from '@/utils/language/detect'
import logger from '@/utils/logger'
import { c2bRpc } from '@/utils/rpc'
import { getUserConfig } from '@/utils/user-config'

const log = logger.child('context-menu')

export async function setTranslationMenuTargetLanguage(currentEnabled: boolean, targetLocale: LanguageCode) {
  const languageName = getLanguageName(targetLocale)
  try {
    if (currentEnabled) {
      await c2bRpc.updateContextMenu('native-mind-page-translate', {
        title: `Show Original`,
      })
    }
    else {
      await c2bRpc.updateContextMenu('native-mind-page-translate', {
        title: `Translate this page into ${languageName}`,
      })
    }
  }
  catch (error) {
    logger.error('Error setting context menu:', error)
  }
}

async function initQuickActionsContextMenu() {
  const userConfig = await getUserConfig()
  const actions = userConfig.chat.quickActions.actions.toRef()
  watch(actions, async (actions) => {
    const parentId = 'native-mind-quick-actions'
    await c2bRpc.deleteContextMenu(parentId).catch((err) => log.debug(err))
    const showInContextMenuActions = actions.filter((action) => action.showInContextMenu)
    if (showInContextMenuActions.length > 0) {
      await c2bRpc.createContextMenu(parentId, {
        title: 'Quick Actions',
        contexts: ['all'],
      })
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i]
        if (!action.showInContextMenu) continue
        await c2bRpc.createContextMenu(`native-mind-quick-actions-${i}`, {
          title: action.title,
          contexts: ['all'],
          parentId,
        })
      }
    }
  }, { deep: true, immediate: true })
}

export async function initContextMenu() {
  initQuickActionsContextMenu()
}
