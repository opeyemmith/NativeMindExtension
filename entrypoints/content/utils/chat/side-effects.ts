import { effectScope, watch } from 'vue'

import { lazyInitialize } from '@/utils/cache'
import { ActionMessageV1 } from '@/utils/tab-store/history'
import { getUserConfig } from '@/utils/user-config'

import { Chat } from './chat'

async function appendOrUpdateQuickActionsIfNeeded(chat: Chat) {
  const userConfig = await getUserConfig()
  const actionsRef = userConfig.chat.quickActions.actions.toRef()
  const icons = ['summarizeBoxed', 'highlightBoxed', 'searchBoxed'] as const
  const actions: ActionMessageV1['actions'] = actionsRef.value.map((action, index) => {
    const defaultTitle = actionsRef.defaultValue[index]?.title
    const defaultPrompt = actionsRef.defaultValue[index]?.prompt
    const isDefault = action.title === defaultTitle && action.prompt === defaultPrompt
    return {
      type: 'customInput' as const,
      data: { prompt: action.prompt },
      content: action.title,
      icon: isDefault ? icons[index % icons.length] : 'quickActionModifiedBoxed',
    }
  })
  if (chat.historyManager.isEmpty()) {
    const actionMessage = chat.historyManager.appendActionMessage(actions)
    actionMessage.titleAction = {
      content: 'Quick Actions',
      type: 'openSettings',
      data: { scrollTarget: 'quick-actions-block' },
      icon: 'edit',
    }
    actionMessage.id = chat.historyManager.generateId('quickActions')
    actionMessage.isDefault = true
  }
  else {
    const actionMessages = chat.historyManager.getMessagesByScope('quickActions') as ActionMessageV1[]
    if (actionMessages.length) {
      actionMessages.forEach((actionMessage) => {
        actionMessage.actions = actions
      })
    }
  }
}

function runInDetachedScope(fn: () => void) {
  const scope = effectScope(true)
  scope.run(() => {
    fn()
  })
}

async function _initChatSideEffects() {
  const userConfig = await getUserConfig()
  const chat = await Chat.getInstance()
  const quickActions = userConfig.chat.quickActions.actions.toRef()
  runInDetachedScope(() => watch(() => [chat.historyManager.history.value.length, quickActions], () => {
    appendOrUpdateQuickActionsIfNeeded(chat)
  }, { immediate: true, deep: true }))
}

export const initChatSideEffects = lazyInitialize(_initChatSideEffects)
