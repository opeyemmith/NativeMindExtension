<template>
  <div>
    <div
      ref="topRef"
      class="bg-[#E9E9EC]"
    >
      <div class="h-13 px-3 flex items-center justify-between border-b border-gray-200 ">
        <div class="left flex items-center gap-2">
          <Logo
            showText
            class="font-bold text-base"
          />
          <IconAdd
            v-if="!chat.historyManager.onlyHasDefaultMessages()"
            class="w-4 cursor-pointer hover:text-gray-500"
            @click="onNewChat"
          />
        </div>
        <div class="right flex items-center gap-4">
          <IconSetting
            class="w-4 cursor-pointer hover:text-gray-500 ml-1"
            @click="onClickSetting"
          />
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
            v-if="showCloseButton"
            class="w-[14px] h-[14px] cursor-pointer hover:text-gray-500"
            @click="tabStore.showContainer.value = false"
          />
        </div>
      </div>
      <div
        class="w-full flex justify-end px-4 pb-px"
        :style="{ top: `${topBounding.height.value}px` }"
      >
        <ModelSelector
          class="max-w-44"
          dropdownAlign="right"
        />
      </div>
    </div>
    <div class="px-5 py-2">
      <div
        class="absolute bottom-0 left-0 right-0"
        :style="{ top: `${topBounding.height.value}px` }"
      >
        <Chat class="h-full" />
      </div>
    </div>
  </div>
</template>
<script setup lang="tsx">
import { useElementBounding } from '@vueuse/core'
import { computed, ref } from 'vue'

import IconClose from '@/assets/icons/close.svg?component'
import IconAdd from '@/assets/icons/new-chat-add.svg?component'
import IconPin from '@/assets/icons/pin.svg?component'
import IconSetting from '@/assets/icons/setting.svg?component'
import IconUnPin from '@/assets/icons/unpin.svg?component'
import Logo from '@/components/Logo.vue'
import ModelSelector from '@/components/ModelSelector.vue'
import { getTabStore } from '@/utils/tab-store'
import { getUserConfig } from '@/utils/user-config'

import { Chat as ChatManager } from '../utils/chat/index'
import Chat from './Chat/index.vue'

const topRef = ref<HTMLDivElement>()
const topBounding = useElementBounding(topRef)
const tabStore = await getTabStore()
const userConfig = await getUserConfig()
const chat = await ChatManager.getInstance()
const pinSidebar = userConfig.ui.pinSidebar.toRef()

const onNewChat = async () => {
  chat.stop()
  chat.historyManager.clear()
  await chat.resetContextTabs()
}

const showCloseButton = computed(() => {
  return !pinSidebar.value
})

const onClickSetting = () => {
  tabStore.showSetting.value = !tabStore.showSetting.value
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
