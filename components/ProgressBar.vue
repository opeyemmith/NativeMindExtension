<template>
  <div class="w-full h-2 bg-gray-200 rounded-md">
    <div
      class="h-full bg-[#24B960] rounded-md transition-all"
      :style="{ width: `${(progress) * 100}%` }"
    />
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{
  progress: number
}>()

const progress = computed(() => {
  return Math.min(Math.max(props.progress, 0), 1)
})
</script>
