<template>
  <slot />
</template>
<script setup lang="ts">
const props = defineProps<{
  rootElement: HTMLDivElement
}>()

useInjectContext('selectorScrollListenElement').provide([props.rootElement])
useInjectContext('rootElement').provide(props.rootElement)
</script>
