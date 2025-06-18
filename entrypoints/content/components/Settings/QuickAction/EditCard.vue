<template>
  <div>
    <div
      v-if="editing"
      class="flex flex-col gap-2"
    >
      <Input v-model="editTitle" />
      <Textarea v-model="editPrompt" />
    </div>
    <div v-else>
      <div class="text-[15px] font-semibold">
        {{ props.title }}
      </div>
      <div class="mt-2 text-sm text-gray-600">
        {{ props.prompt }}
      </div>
      <div v-if="props.showInContextMenu">
        Show in context menu
      </div>
    </div>
    <div
      v-if="editing"
      class="mt-2 flex gap-2 items-center"
    >
      <label class="flex items-center gap-2">
        <Checkbox
          v-model="editShowInContextMenu"
          class="cursor-pointer"
        />
        <span class="text-sm text-gray-600">
          Show in context menu
        </span>
      </label>
      <Button
        variant="primary"
        class="p-1"
        @click="onSave"
      >
        Save
      </Button>
      <Button
        variant="secondary"
        class="p-1"
        @click="onCancel"
      >
        Cancel
      </Button>
      <Button
        variant="secondary"
        class="p-1"
        @click="onReset"
      >
        Reset
      </Button>
    </div>
    <div
      v-else
      class="mt-2 flex gap-2 items-center"
    >
      <Button
        class="p-1"
        @click="editing = true"
      >
        Edit
      </Button>
    </div>
  </div>
</template>
<script setup lang="ts">
import Checkbox from '@/components/Checkbox.vue'
import Input from '@/components/Input.vue'
import Textarea from '@/components/Textarea.vue'
import Button from '@/components/ui/Button.vue'

const props = defineProps<{
  title: string
  prompt: string
  defaultTitle: string
  defaultPrompt: string
  showInContextMenu: boolean
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:prompt', value: string): void
  (e: 'update:showInContextMenu', value: boolean): void
}>()

const editing = ref(false)
const editTitle = ref(props.title)
const editPrompt = ref(props.prompt)
const editShowInContextMenu = ref(props.showInContextMenu)

watch(editing, (newEditing) => {
  if (newEditing) {
    editTitle.value = props.title
    editPrompt.value = props.prompt
    editShowInContextMenu.value = props.showInContextMenu
  }
})

const onReset = () => {
  editTitle.value = props.defaultTitle
  editPrompt.value = props.defaultPrompt
}

const onSave = () => {
  emit('update:title', editTitle.value)
  emit('update:prompt', editPrompt.value)
  emit('update:showInContextMenu', editShowInContextMenu.value)
  editing.value = false
}

const onCancel = () => {
  editTitle.value = props.title
  editPrompt.value = props.prompt
  editing.value = false
}
</script>
