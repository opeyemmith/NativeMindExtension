import { useEventListener, useMutationObserver } from '@vueuse/core'

export function useObserveElements(matched: (el: HTMLElement) => boolean, initElements: HTMLElement[], attributeFilter: string[] = ['contenteditable', 'type']) {
  const elements = ref<HTMLElement[]>([...initElements])
  useEventListener(window, 'focusin', (event) => {
    const target = event.target as HTMLElement
    if (!elements.value.includes(target) && matched(target)) {
      logger.debug('Focusin on new element:', target)
      elements.value.push(target)
    }
  }, { capture: true })
  useMutationObserver(document.body, (mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.removedNodes.forEach((node) => {
          const index = elements.value.indexOf(node as HTMLElement)
          if (index !== -1) {
            elements.value.splice(index, 1)
          }
        })
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'INPUT') {
            logger.debug('Input node added:', node)
          }
          const exist = elements.value.find((el) => el === node)
          if (!exist && node instanceof HTMLElement && matched(node)) {
            logger.debug('Added node:', node, elements.value)
            elements.value.push(node as HTMLElement)
          }
        })
      }
      else if (mutation.type === 'attributes') {
        const target = mutation.target as HTMLElement
        if (target.nodeName === 'INPUT') {
          logger.debug('Attribute changed:', target, mutation.attributeName)
        }
        if (!elements.value.includes(target) && matched(target)) {
          elements.value.push(target)
        }
      }
    })
  },
  {
    childList: true,
    subtree: true,
    attributeFilter,
    attributes: true,
  })
  return { elements }
}
