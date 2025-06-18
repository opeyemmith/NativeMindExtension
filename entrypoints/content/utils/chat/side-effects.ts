import { effectScope, watch } from 'vue'

import { lazyInitialize } from '@/utils/cache'
import { ActionMessageV1 } from '@/utils/tab-store/history'
import { getUserConfig } from '@/utils/user-config'

import { Chat } from './chat'

async function appendQuickActionsIfNeeded(chat: Chat) {
  const userConfig = await getUserConfig()
  const actionsRef = userConfig.chat.quickActions.actions.toRef()
  if (chat.historyManager.isEmpty()) {
    const icons = ['summarizeBoxed', 'highlightBoxed', 'writingBoxed'] as const
    const actions: ActionMessageV1['actions'] = actionsRef.value.map((action, index) => ({
      type: 'customInput' as const,
      data: { prompt: action.prompt },
      content: action.title,
      icon: icons[index % icons.length],
    }))
    const actionMessage = chat.historyManager.appendActionMessage(
      actions,
      'Quick Actions',
    )
    actionMessage.isDefault = true
  }
}

function runInDetachedScope(fn: () => void) {
  const scope = effectScope(true)
  scope.run(() => {
    fn()
  })
}

async function _initChatSideEffects() {
  const chat = await Chat.getInstance()
  runInDetachedScope(() => watch(() => chat.historyManager.history.value.length, () => {
    appendQuickActionsIfNeeded(chat)
  }, { immediate: true }))
}

export const initChatSideEffects = lazyInitialize(_initChatSideEffects)
