<script lang="ts" setup>
// import HelloWorld from "@/components/HelloWorld.vue";
import { getOllamaModel, getOllamaModelUserConfig } from '@/utils/llm/models'
import { generateText } from 'ai'
import { ref, onMounted } from 'vue'

let a = ref('')

onMounted(async () => {
  setTimeout(async () => {
    const r = await generateText({
      model: await getOllamaModel(await getOllamaModelUserConfig()),
      messages: [{ role: 'user', content: '你好' }],
    })
    a.value = r.text
  }, 3000)
})
</script>

<template>
  <div>
    <a href="https://wxt.dev" target="_blank">
      <img src="/wxt.svg" class="logo" alt="WXT logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="@/assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <div>{{ a }}</div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #54bc4ae0);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
