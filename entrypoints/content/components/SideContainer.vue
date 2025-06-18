<template>
  <Transition name="side">
    <div
      v-if="isShowSidebar"
      ref="containerRef"
      class="fixed w-[380px] top-0 bottom-0 right-0 bg-white overflow-y-auto overflow-x-hidden shadow"
    >
      <div class="absolute top-0 left-0 right-0 bottom-0 overflow-hidden">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'

import { useInjectContext } from '@/composables/useInjectContext'
import { registerContentScriptRpcEvent } from '@/utils/rpc'
import { getTabStore } from '@/utils/tab-store'
import { getUserConfig } from '@/utils/user-config'

const tabStore = await getTabStore()
const userConfig = await getUserConfig()
const pinSidebar = userConfig.ui.pinSidebar.toRef()
const containerRef = useTemplateRef<HTMLDivElement>('containerRef')

useInjectContext('sideContainerEl').provide(containerRef)

registerContentScriptRpcEvent('toggleContainer', async ({ open }) => {
  userConfig.ui.pinSidebar.set(false)
  if (open !== undefined) {
    tabStore.showContainer.value = open
  }
  else {
    tabStore.showContainer.value = !tabStore.showContainer.value
  }
})

const isShowSidebar = computed(() => {
  return pinSidebar.value || tabStore.showContainer.value
})
</script>
<style lang="scss">
.side-enter-active,
.side-leave-active {
  transition: all 0.3s var(--ease-cubic-1);
  transform: translateX(0);
}

.side-enter-from,
.side-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
