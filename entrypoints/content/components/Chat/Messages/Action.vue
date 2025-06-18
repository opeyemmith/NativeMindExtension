<template>
  <div>
    <div
      v-if="message.title"
      class="font-semibold mb-1"
    >
      <Text size="medium">
        {{ message.title }}
      </Text>
    </div>
    <div class="flex flex-col gap-2 items-start">
      <div
        v-for="(action, idx) in message.actions"
        :key="idx"
        class="mt-1 text-sm rounded-lg relative inline-block max-w-full bg-white p-2 text-text-primary cursor-pointer hover:bg-gray-100 transition-all"
        :class="disabled ? 'opacity-50 pointer-events-none' : ''"
      >
        <div
          class="flex items-center gap-2"
          @click="
            (ev) =>
              Chat.createActionEventDispatcher(action.type)(action.data, ev.target)
          "
        >
          <div
            v-if="action.icon"
            class="shrink-0 grow-0"
          >
            <div v-html="getIconSvg(action.icon)" />
          </div>
          <MarkdownViewer
            class="shrink grow"
            :text="action.content"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Text from '@/components/ui/Text.vue'
import { Chat } from '@/entrypoints/content/utils/chat'
import { getIconSvg } from '@/entrypoints/content/utils/markdown/content'
import { ActionMessageV1 } from '@/utils/tab-store/history'

import MarkdownViewer from '../../MarkdownViewer.vue'

defineProps<{
  disabled?: boolean
  message: ActionMessageV1
}>()
</script>
