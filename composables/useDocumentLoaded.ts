import { useEventListener } from '@vueuse/core'

export function useDocumentLoaded(cb: () => void) {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // If the document is already loaded, we can call the callback immediately.
    cb()
    return
  }
  useEventListener(document, 'DOMContentLoaded', () => {
    cb()
  }, { once: true })
}
