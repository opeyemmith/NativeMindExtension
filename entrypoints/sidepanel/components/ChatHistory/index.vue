<template>
  <div class="space-y-2">
    <div
      v-if="chatList.length === 0"
      class="text-gray-500 text-sm text-center py-4"
    >
      No chat history found
    </div>
    <div
      v-for="chatItem in chatList"
      :key="chatItem.id"
      class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
      @click="$emit('chat-selected', chatItem.id)"
    >
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-gray-900 truncate">
          {{ chatItem.title }}
        </div>
        <div class="text-xs text-gray-500">
          {{ formatDate(chatItem.timestamp) }}
        </div>
      </div>
      <button
        @click.stop="deleteChatItem(chatItem.id)"
        class="ml-2 text-red-500 hover:text-red-700 text-xs p-1"
        title="Delete chat"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chat } from '../../utils/chat'

defineEmits<{
  'chat-selected': [chatId: string]
}>()

const chat = await Chat.getInstance()
const chatList = chat.chatList

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffInDays === 1) {
    return 'Yesterday'
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
}

const deleteChatItem = async (chatId: string) => {
  if (confirm('Are you sure you want to delete this chat?')) {
    // Access the static chatStorage property
    const ChatClass = Chat as any
    await ChatClass.chatStorage.removeItem(chatId, 'chat')
    await ChatClass.chatStorage.removeItem(chatId, 'context-attachments')
  }
}
</script>
