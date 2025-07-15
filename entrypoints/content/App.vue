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
      <Main ref="mainRef" />
      <Modal
        v-model="tabStore.showSetting.value.show"
        :mountPoint="rootElement"
        noCloseButton
        closeByMask
        class="fixed"
      >
        <Settings
          :scrollTarget="tabStore.showSetting.value.scrollTarget"
          :downloadModel="tabStore.showSetting.value.downloadModel"
          class="bg-[#E9E9EC] text-black text-xs"
          :style="{ zIndex: settingsPanelZIndex }"
        />
      </Modal>
    </SideContainer>
  </Suspense>
</template>

<script setup lang="tsx">
import mime from 'mime'
import { onMounted, useTemplateRef, watch } from 'vue'

import Modal from '@/components/Modal.vue'
import { useToast } from '@/composables/useToast'
import { useZIndex } from '@/composables/useZIndex'
import { sleep } from '@/utils/async'
import logger from '@/utils/logger'
import { c2bRpc, registerContentScriptRpcEvent } from '@/utils/rpc'
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
import { useInjectOllamaDownloadButtons } from './utils/page-injection/ollama-search-page'
import { showSettings } from './utils/settings'
import { getCurrentTabInfo } from './utils/tabs'

// init translator global event listeners
useTranslator()
useInjectOllamaDownloadButtons()
initContextMenu()
const toast = useToast()
const mainRef = useTemplateRef('mainRef')
const { index: settingsPanelZIndex } = useZIndex('settings')
const { index: onboardingPanelZIndex } = useZIndex('settings')
const rootElement = useRootElement()
const tabStore = await getTabStore()
const userConfig = await getUserConfig()

registerContentScriptRpcEvent('tabUpdated', async (tabInfo) => {
  if (tabInfo.tabId === tabStore.currentTabId.value) {
    if (tabInfo.title) tabStore.tabInfo.value.title = tabInfo.title
    if (tabInfo.url) tabStore.tabInfo.value.url = tabInfo.url
    if (tabInfo.faviconUrl) tabStore.tabInfo.value.faviconUrl = tabInfo.faviconUrl
  }
})

registerContentScriptRpcEvent('contextMenuClicked', async (e) => {
  if (e.menuItemId === 'native-mind-settings') {
    showSettings(true)
    tabStore.showContainer.value = true
  }
  else if (e.menuItemId.startsWith('native-mind-quick-actions-')) {
    const actionIdx = parseInt(e.menuItemId.replace('native-mind-quick-actions-', '')) || 0
    const action = userConfig.chat.quickActions.actions.get()[actionIdx]
    const chat = await Chat.getInstance()
    tabStore.showContainer.value = true
    showSettings(false)
    if (action && !chat.isAnswering()) {
      chat.ask(action.prompt)
    }
  }
  else if (e.menuItemId === 'native-mind-add-image-to-chat' && e.srcUrl) {
    const tabStore = await getTabStore()
    const srcUrl = e.srcUrl
    const resp = await fetch(srcUrl)
    const blob = await resp.blob()
    const extension = mime.getExtension(blob.type)
    if (!extension) {
      logger.warn(`Unsupported image type: ${blob.type}`)
      return
    }
    let imageFileName = `image.${extension}`
    if (srcUrl.endsWith(`.${extension}`)) {
    // If the URL already has the correct extension, use it as is
      imageFileName = srcUrl.split('/').pop() || imageFileName
    }
    const file = new File([blob], imageFileName, { type: blob.type })
    tabStore.showContainer.value = true
    const stopWatch = watch(() => mainRef.value?.chatRef?.attachmentSelectorRef, (attachmentSelector) => {
      if (!attachmentSelector) return
      attachmentSelector.appendAttachmentsFromFiles([file])
      sleep(0).then(() => stopWatch())
    }, { immediate: true })
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
  await c2bRpc.emit('ready', tabInfo.tabId)
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
