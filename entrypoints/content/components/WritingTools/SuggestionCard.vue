<template>
  <div>
    <div class="card w-80 max-w-screen text-xs flex flex-col gap-3">
      <div class="title font-bold">
        <!-- Content based on type -->
        <div v-if="props.type === 'rewrite'">
          Rewrite Suggestion
        </div>
        <div v-else-if="props.type === 'proofread'">
          Grammar & Style
        </div>
        <div v-else-if="props.type === 'list'">
          Key Points
        </div>
        <div v-else-if="props.type === 'sparkle'">
          Sparkle Text
        </div>
        <ExhaustiveError v-else />
      </div>
      <div class="output p-2 bg-amber-50 shadow-[-4px_0_var(--color-amber-200)] rounded-md">
        <div
          v-if="runningStatus === 'pending'"
          class="loading"
        >
          <Loading
            :size="12"
            class="text-gray-500"
          />
        </div>
        <div v-else>
          <MarkdownViewer :text="output" />
        </div>
      </div>
      <div class="flex items-center gap-2 justify-end">
        <button
          class="border border-gray-300 rounded-md bg-white px-2 h-7 text-xs text-gray-500 hover:bg-gray-100 cursor-pointer"
          @click="emit('close')"
        >
          Dismiss
        </button>
        <button
          class="bg-blue-500 text-white px-2 h-7 rounded-md text-xs hover:bg-blue-600 cursor-pointer"
          :class="{ 'opacity-50 pointer-events-none': runningStatus !== 'idle' }"
          @click="emit('apply', output.trim())"
        >
          Apply
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

import ExhaustiveError from '@/components/ExhaustiveError.vue'
import Loading from '@/components/Loading.vue'
import logger from '@/utils/logger'
import { writingToolList, writingToolProofread, writingToolRewrite, writingToolSparkle } from '@/utils/prompts'
import { Prompt } from '@/utils/prompts/helpers'

import { streamTextInBackground } from '../../utils/llm'
import MarkdownViewer from '../MarkdownViewer.vue'
import { WritingToolType } from './types'

const log = logger.child('WritingTools/SuggestionCard')

const props = defineProps<{
  type: WritingToolType
  selectedText: string
  regenerateSymbol?: number
}>()

const emit = defineEmits<{
  (event: 'apply', text: string): void
  (event: 'close'): void
}>()

const output = ref<string>(``)
const abortControllers: AbortController[] = []
const runningStatus = ref<'pending' | 'streaming' | 'idle'>('idle')
const abortExistingStreams = () => {
  abortControllers.forEach((controller) => controller.abort())
  abortControllers.length = 0
  output.value = ''
}

const prompts: Record<WritingToolType, (text: string) => PromiseLike<Prompt> | Prompt> = {
  rewrite: writingToolRewrite,
  proofread: writingToolProofread,
  list: writingToolList,
  sparkle: writingToolSparkle,
}

const start = async () => {
  abortExistingStreams()
  const abortController = new AbortController()
  abortControllers.push(abortController)
  try {
    runningStatus.value = 'pending'
    output.value = ''
    const prompt = await prompts[props.type](props.selectedText)
    const iter = streamTextInBackground({
      prompt: prompt.user,
      system: prompt.system,
      abortSignal: abortController.signal,
    })
    for await (const chunk of iter) {
      if (chunk.type === 'text-delta') {
        runningStatus.value = 'streaming'
        output.value += chunk.textDelta
      }
    }
    log.debug('Rewrite response:', output.value)
  }
  catch (error) {
    const errorMessage = (error && typeof error === 'object' && 'name' in error) ? error.name : 'Unknown error'
    output.value = `Error generating suggestion: ${errorMessage}`
    log.error('Error in writing tool stream:', error)
  }
  finally {
    if (abortControllers.includes(abortController) && abortControllers.length === 1) {
      runningStatus.value = 'idle'
      abortControllers.length = 0
    }
  }
}

watch(() => [props.type, props.regenerateSymbol, props.selectedText], () => {
  start()
}, { immediate: true })

onBeforeUnmount(() => {
  abortExistingStreams()
})
</script>
