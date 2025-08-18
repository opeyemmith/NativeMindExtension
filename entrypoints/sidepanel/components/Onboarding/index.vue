<template>
  <div
    v-if="isShow"
    class="bg-[#E9E9EC]"
  >
    <div ref="topRef">
      <div class="h-12 px-3 flex items-center justify-start border-b border-gray-200">
        <div class="text-center" />
        <div class="absolute right-4 h-full flex items-center gap-4">
          <IconClose
            class="w-4 h-4 cursor-pointer hover:text-gray-500"
            @click="onSetupComplete"
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
        class="flex flex-col items-stretch gap-4 justify-start px-4 py-2 pb-4 min-h-full"
      >
        <Logo
          showText
          class="mx-auto text-base"
        />
        <SloganCard />
        <div class="bg-white rounded-lg overflow-hidden grow flex flex-col justify-between font p-6">
          <div class="flex flex-col gap-4">
            <h2 class="text-xl font-semibold text-gray-800">Welcome to NativeMind</h2>
            <p class="text-gray-600">
              Get started with AI-powered browsing using OpenRouter's cloud models.
            </p>
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span class="text-sm text-gray-700">Access to 100+ AI models</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span class="text-sm text-gray-700">No local installation required</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span class="text-sm text-gray-700">Pay-per-use pricing</span>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-3 mt-6">
            <button
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              @click="onOpenSettings"
            >
              Configure OpenRouter API Key
            </button>
            <button
              class="text-blue-600 hover:text-blue-700 text-sm"
              @click="openOpenRouterSignup"
            >
              Don't have an account? Sign up for OpenRouter
            </button>
          </div>
        </div>
      </div>
    </ScrollContainer>
  </div>
</template>

<script setup lang="tsx">
import { computed } from 'vue'

import IconClose from '@/assets/icons/close.svg?component'
import Logo from '@/components/Logo.vue'
import ScrollContainer from '@/components/ScrollContainer.vue'
import { useI18n } from '@/utils/i18n'
import { getUserConfig, TARGET_ONBOARDING_VERSION } from '@/utils/user-config'

import { showSettings } from '../../../../utils/settings'
import { Chat } from '../../utils/chat'
import { welcomeMessage } from '../../utils/chat/texts'
import SloganCard from './SloganCard.vue'

const { t } = useI18n()
const userConfig = await getUserConfig()
const chat = await Chat.getInstance()
const onboardingVersion = userConfig.ui.onboarding.version.toRef()

const isShow = computed(() => {
  return onboardingVersion.value !== TARGET_ONBOARDING_VERSION
})

const onOpenSettings = async () => {
  close()
  showSettings()
}

const openOpenRouterSignup = () => {
  window.open('https://openrouter.ai/', '_blank')
}

const onSetupComplete = () => {
  close()
}

const setWelcomeChatMessage = () => {
  // FYI: this message will also be modified by side-effects.ts for locale changes
  const msg = chat.historyManager.appendAssistantMessage(welcomeMessage(t))
  msg.style = {
    backgroundColor: 'transparent',
  }
  msg.isDefault = true
  msg.done = true
  msg.timestamp = undefined
  msg.id = chat.historyManager.generateId('welcomeMessage')
  chat.historyManager.insertMessageAt(msg, 0)
}

const close = () => {
  setWelcomeChatMessage()
  onboardingVersion.value = TARGET_ONBOARDING_VERSION
}
</script>
