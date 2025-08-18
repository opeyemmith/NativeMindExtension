<template>
  <div>
    <div
      ref="topRef"
      class="bg-[#E9E9EC]"
    >
      <div class="h-15 px-4 flex items-center justify-between border-b border-gray-200">
        <div class="left flex items-center gap-2">
          <Logo
            class="font-bold text-base"
          />
        </div>
        <div class="right flex items-center gap-2">
          <Tooltip
            :content="t('tooltips.chat_history')"
          >
            <div
              class="p-2 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors"
              @click="toggleChatHistory"
            >
              <IconMenu
                class="size-4"
              />
            </div>
          </Tooltip>
          <Tooltip
            :content="t('tooltips.clear_chat')"
          >
            <div
              class="p-2 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors"
              @click="onNewChat"
            >
              <IconNewChat
                class="size-4"
              />
            </div>
          </Tooltip>
          <Tooltip :content="t('tooltips.settings')">
            <div
              class="p-2 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors"
              @click="onClickSetting"
            >
              <IconSetting
                class="size-4"
              />
            </div>
          </Tooltip>
        </div>
      </div>
      <!-- Header Divider -->
      <div class="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      <!-- Chat History Dropdown -->
      <div
        v-if="showChatHistory"
        ref="chatHistoryRef"
        class="absolute top-full right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto"
      >
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-semibold text-sm">Chat History</h3>
          <button
            @click="toggleChatHistory"
            class="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <ChatHistory @chat-selected="onChatSelected" />
      </div>
    </div>
    <div class="px-5 py-2">
      <div
        class="absolute bottom-0 left-0 right-0"
        :style="{ top: `${topBounding.height.value}px` }"
      >
        <Chat
          ref="chatRef"
          class="h-full"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { useElementBounding, onClickOutside } from '@vueuse/core'
import { ref } from 'vue'

import IconNewChat from '@/assets/icons/new-chat-add.svg?component'
import IconMenu from '@/assets/icons/menu.svg?component'
import IconSetting from '@/assets/icons/setting.svg?component'
import Logo from '@/components/Logo.vue'
import Tooltip from '@/components/ui/Tooltip.vue'
import { generateRandomId } from '@/utils/id'
import { useI18n } from '@/utils/i18n'
import { getUserConfig } from '@/utils/user-config'

import { showSettings } from '../../../utils/settings'
import { Chat as ChatManager } from '../utils/chat/index'
import Chat from './Chat/index.vue'
import ChatHistory from './ChatHistory/index.vue'

const chatRef = ref<InstanceType<typeof Chat>>()
const topRef = ref<HTMLDivElement>()
const chatHistoryRef = ref<HTMLDivElement>()
const topBounding = useElementBounding(topRef)
const { t } = useI18n()
const showChatHistory = ref(false)

// Close chat history when clicking outside
onClickOutside(chatHistoryRef, () => {
  showChatHistory.value = false
})

defineExpose({
  chatRef: chatRef,
})

const chat = await ChatManager.getInstance()

const onNewChat = async () => {
  chat.stop()
  // Create a new chat ID and set it in user config
  const newChatId = generateRandomId()
  const userConfig = await getUserConfig()
  await userConfig.chat.history.currentChatId.set(newChatId)
}

const toggleChatHistory = () => {
  showChatHistory.value = !showChatHistory.value
}

const onChatSelected = async (chatId: string) => {
  const userConfig = await getUserConfig()
  await userConfig.chat.history.currentChatId.set(chatId)
  showChatHistory.value = false
}

const onClickSetting = () => {
  showSettings()
}
</script>

<style lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s var(--ease-cubic-1);
  transform: translateY(0);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
