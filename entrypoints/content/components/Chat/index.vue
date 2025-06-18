<template>
  <div
    class="bg-[#E9E9EC]"
    @messageAction="actionEventHandler"
  >
    <ScrollContainer
      ref="scrollContainerRef"
      :autoSnap="{ bottom: true }"
      :style="{ height: `calc(100% - ${inputContainerHeight}px)` }"
      :arrivalShadow="{
        top: { color: '#E9E9EC', size: 36 },
        bottom: { color: '#E9E9EC', size: 36 }
      }"
    >
      <div class="flex flex-col gap-2 px-4 py-4 pt-11">
        <div
          v-for="(item, index) in chat.historyManager.history.value"
          :key="index"
          :class="[item.role === 'user' ? 'self-end' : 'self-start']"
          class="max-w-full relative"
        >
          <div
            v-if="item.role === 'user'"
            class="flex flex-col items-end"
          >
            <div class="text-sm inline-block bg-[#24B960] rounded-md p-3">
              <div class="wrap-anywhere text-white">
                <MarkdownViewer :text="item.content" />
              </div>
            </div>
          </div>
          <MessageAssistant
            v-else-if="item.role === 'assistant'"
            :message="item"
          />
          <div v-else-if="item.role === 'task'">
            <MessageTask :message="item" />
          </div>
          <MessageAction
            v-else-if="item.role === 'action'"
            :message="item"
            :disabled="chat.isAnswering()"
          />
          <ExhaustiveError v-else />
        </div>
      </div>
    </ScrollContainer>
    <div
      ref="inputContainerRef"
      class="p-3 absolute bottom-0 left-0 right-0 flex flex-col gap-3 z-50"
    >
      <div>
        <TabSelector v-model:selectedTabs="contextTabs" />
      </div>
      <div class="flex gap-1">
        <ScrollContainer
          class="max-h-72 grow shadow-02 bg-white rounded-md"
          itemContainerClass="p-2"
        >
          <div class="flex gap-1 items-stretch">
            <AutoExpandTextArea
              v-model="userInput"
              maxlength="2000"
              type="text"
              :placeholder="chat.historyManager.onlyHasDefaultMessages() ||
                chat.historyManager.isEmpty()
                ? 'Ask anything...'
                : 'Ask follow up...'
              "
              class="w-full block outline-none border-none resize-none p-2 field-sizing-content leading-3 text-sm"
              @keydown="onKeydown"
              @compositionstart="isComposing = true"
              @compositionend="isComposing = false"
            />
            <Button
              v-if="chat.isAnswering()"
              variant="secondary"
              class="px-2 grow-0 shrink-0"
              @click="onStop"
            >
              {{ "Stop" }}
            </Button>
            <Button
              v-else
              variant="primary"
              class="px-2 grow-0 shrink-0"
              :disabled="!allowAsk"
              @click="onSubmit"
            >
              <IconSendFill class="w-4 h-4 text-white" />
            </Button>
          </div>
        </ScrollContainer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useElementBounding } from '@vueuse/core'

import IconSendFill from '@/assets/icons/send-fill.svg?component'
import AutoExpandTextArea from '@/components/AutoExpandTextArea.vue'
import ExhaustiveError from '@/components/ExhaustiveError.vue'
import ScrollContainer from '@/components/ScrollContainer.vue'
import Button from '@/components/ui/Button.vue'
import {
  Chat,
  initChatSideEffects,
} from '@/entrypoints/content/utils/chat/index'

import MarkdownViewer from '../MarkdownViewer.vue'
import TabSelector from '../TabSelector.vue'
import MessageAction from './Messages/Action.vue'
import MessageAssistant from './Messages/Assistant.vue'
import MessageTask from './Messages/Task.vue'

const inputContainerRef = ref<HTMLDivElement>()
const { height: inputContainerHeight } = useElementBounding(inputContainerRef)

const userInput = ref('')
const isComposing = ref(false)
const chat = await Chat.getInstance()
const scrollContainerRef = ref<InstanceType<typeof ScrollContainer>>()
const contextTabs = chat.contextTabs

initChatSideEffects()

const actionEventHandler = Chat.createActionEventHandler((actionEvent) => {
  if (actionEvent.action === 'customInput') {
    chat.ask(actionEvent.data.prompt)
  }
  else {
    throw new Error(`Unknown action: ${actionEvent.action}`)
  }
})

const allowAsk = computed(() => {
  return !chat.isAnswering() && userInput.value.trim().length > 0
})

const cleanUp = chat.historyManager.onMessageAdded(() => {
  scrollContainerRef.value?.snapToBottom()
})

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey && !isComposing.value) {
    if (!allowAsk.value) return
    e.preventDefault()
    onSubmit()
  }
}

const onSubmit = () => {
  ask()
}

const onStop = () => {
  chat.stop()
}

const ask = async () => {
  if (!allowAsk.value) return
  chat.ask(userInput.value)
  userInput.value = ''
}

// const displayTimestamp = (timestamp: number) => {
//   return dayjs(timestamp).tz(dayjs.tz.guess()).format('hh:mm a')
// }

// const displayFullTime = (timestamp: number) => {
//   return dayjs(timestamp).tz(dayjs.tz.guess()).format('YYYY-MM-DD hh:mm a')
// }

onMounted(() => {
  scrollContainerRef.value?.snapToBottom()
})

onBeforeUnmount(() => {
  cleanUp()
})
</script>
