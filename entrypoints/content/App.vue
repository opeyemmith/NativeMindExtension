<template>
  <Suspense>
    <WritingTools />
  </Suspense>
  <Suspense>
    <SideContainer class="text-black text-xs flex flex-col gap-2 font-inter">
      <Transition name="wrapper">
        <Onboarding
          class="absolute inset-0"
          :style="{ zIndex: onboardingPanelZIndex }"
        />
      </Transition>
      <Main />
      <Modal
        v-model="isShowSettings"
        :mountPoint="rootElement"
        noCloseButton
        closeByMask
        class="fixed"
      >
        <Settings
          v-if="isShowSettings"
          class="bg-[#E9E9EC] text-black text-xs"
          :style="{ zIndex: settingsPanelZIndex }"
        />
      </Modal>
    </SideContainer>
  </Suspense>
</template>

<script setup lang="tsx">
import { computed, onMounted } from 'vue'

import Modal from '@/components/Modal.vue'
import { useToast } from '@/composables/useToast'
import { useZIndex } from '@/composables/useZIndex'
import { registerContentScriptRpcEvent } from '@/utils/rpc'
import { registerContentScriptRpcEventFromMainWorld } from '@/utils/rpc/content-main-world-fns'
import { getTabStore } from '@/utils/tab-store'
import { getUserConfig } from '@/utils/user-config'

import Main from './components/Main.vue'
import Onboarding from './components/Onboarding/index.vue'
import Settings from './components/Settings/index.vue'
import SideContainer from './components/SideContainer.vue'
import WritingTools from './components/WritingTools/index.vue'
import { useRootElement } from './composables/useRootElement'
import { useTranslator } from './composables/useTranslator'
import { Chat } from './utils/chat'
import { initContextMenu } from './utils/context-menu'
import { getCurrentTabInfo } from './utils/tabs'

const tabStore = await getTabStore()
const userConfig = await getUserConfig()
const rootElement = useRootElement()
// init translator global event listeners
useTranslator()
initContextMenu()

const toast = useToast()
const { index: settingsPanelZIndex } = useZIndex('settings')
const { index: onboardingPanelZIndex } = useZIndex('settings')
const isShowSettings = computed({
  get() {
    return tabStore.showSetting.value
  },
  set(value) {
    tabStore.showSetting.value = value
  },
})

registerContentScriptRpcEvent('tabUpdated', async (tabInfo) => {
  if (tabInfo.tabId === tabStore.currentTabId.value) {
    if (tabInfo.title) tabStore.tabInfo.value.title = tabInfo.title
    if (tabInfo.url) tabStore.tabInfo.value.url = tabInfo.url
    if (tabInfo.faviconUrl) tabStore.tabInfo.value.faviconUrl = tabInfo.faviconUrl
  }
})

registerContentScriptRpcEvent('contextMenuClicked', async (e) => {
  if (e.menuItemId === 'native-mind-settings') {
    tabStore.showSetting.value = true
    tabStore.showContainer.value = true
  }
  else if (e.menuItemId.startsWith('native-mind-quick-actions-')) {
    const actionIdx = parseInt(e.menuItemId.replace('native-mind-quick-actions-', '')) || 0
    const action = userConfig.chat.quickActions.actions.get()[actionIdx]
    const chat = await Chat.getInstance()
    tabStore.showContainer.value = true
    tabStore.showSetting.value = false
    if (action && !chat.isAnswering()) {
      chat.ask(action.prompt)
    }
  }
})

registerContentScriptRpcEventFromMainWorld('toast', (toastInfo) => {
  toast(toastInfo.message, {
    type: toastInfo.type,
    duration: toastInfo.duration,
  })
})

onMounted(async () => {
  const tabInfo = await getCurrentTabInfo()
  if (tabInfo.title) tabStore.tabInfo.value.title = tabInfo.title
  if (tabInfo.url) tabStore.tabInfo.value.url = tabInfo.url
  if (tabInfo.faviconUrl) tabStore.tabInfo.value.faviconUrl = tabInfo.faviconUrl
})
</script>

<style lang="scss">
.wrapper-enter-active,
.wrapper-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.75, 0.19, 1.015);
  transform: translateX(0);
}

.wrapper-enter-from,
.wrapper-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
