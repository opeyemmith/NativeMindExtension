<template>
  <div class="flex flex-col gap-2">
    <button
      class="text-white bg-blue-500 p-2 rounded-md hover:bg-blue-600 cursor-pointer flex items-center gap-2 justify-center"
      @click="summarizePage"
    >
      <IconMenu class="w-4 h-4" />
      Summarize this page
    </button>
  </div>
</template>

<script setup lang="tsx">
import IconMenu from '@/assets/icons/menu.svg?component'

import { Chat } from '../utils/chat/index'

const chat = await Chat.getInstance()

const summarizePage = async () => {
  chat.summarizeCurrentPage('Summarize this page')
}
</script>
