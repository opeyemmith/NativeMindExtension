import { inject, provide, type Ref } from 'vue'

type InjectContext = {
  sideContainerEl: Ref<HTMLDivElement | null>
  rootElement: HTMLElement
  selectorScrollListenElement: HTMLElement[]
}

export function useInjectContext<K extends keyof InjectContext>(id: K) {
  return {
    inject: () => inject<InjectContext[K]>(id),
    provide: (value: InjectContext[K]) => {
      provide<InjectContext[K]>(id, value)
    },
  }
}
