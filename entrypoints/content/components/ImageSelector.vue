<template>
  <div
    class="relative"
    @click="chooseImages"
  >
    <Button
      class="p-1"
      variant="secondary"
    >
      choose images
    </Button>
    <div>
      <ScrollContainer
        ref="tabsContainerRef"
        class="shrink grow min-w-0"
        itemContainerClass="flex gap-2 w-max items-center"
        :redirect="{ vertical: 'horizontal', horizontal: 'horizontal' }"
        :arrivalShadow="{ left: { color: '#E9E9EC', size: 60 }, right: { color: '#E9E9EC', size: 60 } }"
      >
        <img
          v-for="(imageUrl, index) in base64Urls"
          :key="index"
          :src="imageUrl"
          class="w-10 h-10 object-cover rounded-md m-1"
        >
      </ScrollContainer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFileDialog, useVModel } from '@vueuse/core'
import { computed, watch } from 'vue'

import ScrollContainer from '@/components/ScrollContainer.vue'
import Button from '@/components/ui/Button.vue'
import { convertImageFileToJpegBase64 } from '@/utils/image'

type Base64 = string

interface ImageData {
  data: Base64
  type: string
}

const props = defineProps<{
  selectedImages: ImageData[]
}>()

const emit = defineEmits<{
  (e: 'update:selectedImages', tabs: ImageData[]): void
}>()

const selectedImages = useVModel(props, 'selectedImages', emit)
const { files, open } = useFileDialog({
  accept: 'image/*', // Set to accept only image files
  multiple: true, // Allow multiple file selection
})

watch(files, async (newFiles) => {
  if (newFiles) {
    const fileList = Array.from(newFiles)
    const fileData: ImageData[] = []
    for (const file of fileList) {
      fileData.push({
        data: await convertImageFileToJpegBase64(file),
        type: 'image/jpeg', // Assuming all images are converted to JPEG
      })
    }
    selectedImages.value = [...fileData]
  }
})

const base64Urls = computed(() => selectedImages.value.map((image) => {
  return `data:${image.type};base64,${image.data}`
}))

const chooseImages = async () => {
  open()
}

</script>

<style lang="scss">
.selector-enter-active,
.selector-leave-active {
  transition: all 0.3s var(--ease-cubic-1);
  transform: translateY(0%);
}

.selector-enter-from,
.selector-leave-to {
  opacity: 0;
  transform: translateY(50%);
}
</style>
