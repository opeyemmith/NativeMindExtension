<template>
  <div class="w-full">
    <button
      class="w-full flex justify-center items-center gap-2 text-white bg-blue-500 p-2 rounded-md hover:bg-blue-600 cursor-pointer"
      @click="translator.toggleTranslation()"
    >
      <IconTranslate class="w-4 h-4" />
      <span>{{ translator.enabled.value ? 'Show Original' : 'Translate this page' }}</span>
      <Loading
        v-if="translator.isTranslating.value"
        class="text-white"
        :size="10"
      />
    </button>
  </div>
</template>
<script setup lang="tsx">
import IconTranslate from '@/assets/icons/translate.svg?component'
import Loading from '@/components/Loading.vue'

import { useTranslator } from '../composables/useTranslator'

const translator = await useTranslator()
</script>
