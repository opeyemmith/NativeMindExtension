<template>
  <div
    v-if="isShow"
    class="bg-[#E9E9EC]"
  >
    <div ref="topRef">
      <div class="h-12 px-3 flex items-center justify-start border-b border-gray-200">
        <div class="text-center" />
        <div class="absolute right-4 h-full flex items-center gap-4">
          <IconPin
            v-if="!pinSidebar"
            class="w-4 cursor-pointer hover:text-gray-500"
            @click="pinSidebar = true"
          />
          <IconUnPin
            v-else
            class="w-4 cursor-pointer hover:text-gray-500"
            @click="pinSidebar = false"
          />
          <IconClose
            class="w-4 h-4 cursor-pointer hover:text-gray-500"
            @click="onModelDownloaderFinished"
          />
        </div>
      </div>
    </div>
    <ScrollContainer
      containerClass="h-full"
      itemContainerClass="h-max min-h-full"
      class="absolute top-12 left-0 right-0 bottom-0"
    >
      <div
        class="flex flex-col items-stretch gap-4 justify-start px-4 py-2 min-h-full"
      >
        <Logo
          showText
          class="mx-auto text-base"
        />
        <SloganCard />
        <div
          v-if="panel === 'tutorial'"
          class="bg-white rounded-lg overflow-hidden grow flex flex-col justify-between font"
        >
          <OllamaTutorialCard
            @installed="onOllamaInstalled"
            @settings="onOpenSettings"
          />
          <WebLLMTutorialCard @installed="onWebLLMInstalled" />
        </div>
        <div
          v-else-if="panel === 'model-downloader'"
          class="grow grid place-content-stretch"
        >
          <OllamaModelDownloader
            @finished="onModelDownloaderFinished"
          />
        </div>
        <ExhaustiveError v-else />
      </div>
    </ScrollContainer>
  </div>
</template>
<script setup lang="tsx">
import { computed, onMounted, ref } from 'vue'

import IconClose from '@/assets/icons/close.svg?component'
import IconPin from '@/assets/icons/pin.svg?component'
import IconUnPin from '@/assets/icons/unpin.svg?component'
import ExhaustiveError from '@/components/ExhaustiveError.vue'
import Logo from '@/components/Logo.vue'
import ScrollContainer from '@/components/ScrollContainer.vue'
import { getTabStore } from '@/utils/tab-store'
import { getUserConfig, TARGET_ONBOARDING_VERSION } from '@/utils/user-config'

import { useOllamaStatusStore } from '../../store'
import { Chat } from '../../utils/chat'
import { makeContainer, makeParagraph } from '../../utils/markdown/content'
import OllamaModelDownloader from './OllamaModelDownloader.vue'
import OllamaTutorialCard from './OllamaTutorialCard.vue'
import SloganCard from './SloganCard.vue'
import WebLLMTutorialCard from './WebLLMTutorialCard.vue'

const userConfig = await getUserConfig()
const tabStore = await getTabStore()
const chat = await Chat.getInstance()
const ollamaStatusStore = useOllamaStatusStore()
const endpointType = userConfig.llm.endpointType.toRef()
const onboardingVersion = userConfig.ui.onboarding.version.toRef()
const panel = ref<'tutorial' | 'model-downloader'>('tutorial')
const isShow = computed(() => {
  return onboardingVersion.value !== TARGET_ONBOARDING_VERSION
})
const pinSidebar = userConfig.ui.pinSidebar.toRef()

const onOllamaInstalled = async () => {
  endpointType.value = 'ollama'
  const modelList = await ollamaStatusStore.updateModelList()
  if (modelList.length === 0) {
    panel.value = 'model-downloader'
  }
  else {
    close()
  }
}

const onOpenSettings = async () => {
  endpointType.value = 'ollama'
  close()
  tabStore.showSetting.value = true
}

const onModelDownloaderFinished = async () => {
  endpointType.value = 'ollama'
  await ollamaStatusStore.updateConnectionStatus()
  await ollamaStatusStore.updateModelList()
  close()
}

const onWebLLMInstalled = () => {
  endpointType.value = 'web-llm'
  close()
}

const setWelcomeChatMessage = () => {
  const msg = chat.historyManager.appendAssistantMessage(`
${makeParagraph(`👋 Welcome to **NativeMind**`, { class: 'text-base font-normal' })}

${makeContainer(`NativeMind is a privacy-first AI browser extension that helps you chat, search, and translate — all powered by on-device language models.

Here’s what you can do with NativeMind:

- Chat across multiple tabs to keep track of different pages.
- Search the web directly within the chat for more context.
- Right-click to translate any part of the page instantly.
- Switch or download models anytime in Settings.

You can start by trying out the quick actions below.`, { class: 'text-xs text-[#596066]' })}
`.trim())
  msg.style = {
    backgroundColor: 'transparent',
  }
  msg.isDefault = true
  msg.done = true
  msg.timestamp = undefined
  chat.historyManager.insertMessageAt(msg, 0)
}

const close = () => {
  setWelcomeChatMessage()
  onboardingVersion.value = TARGET_ONBOARDING_VERSION
}

onMounted(async () => {
  if (isShow.value) {
    const success = await ollamaStatusStore.updateConnectionStatus()
    if (success) {
      onOllamaInstalled()
    }
  }
})
</script>
