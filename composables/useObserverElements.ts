import { ref } from 'vue'

export function useFocusedElements(matched: (el: HTMLElement) => boolean) {
  const elements = ref<HTMLElement[]>([])

  const onFocus = (event: FocusEvent) => {
    const target = event.target as HTMLElement
    if (!elements.value.includes(target) && matched(target)) {
      elements.value = [target]
    }
  }

  const start = () => {
    stop()
    window.addEventListener('focusin', onFocus, true)
  }
  const stop = () => {
    window.removeEventListener('focusin', onFocus, true)
    elements.value = []
  }
  start()
  return { elements, start, stop }
}
