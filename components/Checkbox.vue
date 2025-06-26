<template>
  <div
    class="h-4 w-4 rounded-[3px] cursor-pointer"
    :class="classNames({
      'bg-[#24B960] shadow-[0px_0px_0px_1px_#24B960]': checked,
      'bg-bg-component shadow-[0px_0px_0px_1px_#00000014,0px_1px_2px_0px_#0000001F]': !checked,
    }, props.class)"
    @click="(checked = !checked)"
  >
    <IconTick v-if="checked" />
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'

import IconTick from '@/assets/icons/checkbox-tick.svg?component'
import { classNames, type ComponentClassAttr } from '@/utils/vue/utils'

const props = defineProps<{
  modelValue: boolean
  class?: ComponentClassAttr
  disabled?: boolean
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const checked = useVModel(props, 'modelValue', emit)
</script>
