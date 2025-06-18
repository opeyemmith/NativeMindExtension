import { createPinia } from 'pinia'
import type { Component } from 'vue'
import { createApp } from 'vue'

import { i18n } from '@/utils/i18n'
import type { ContentScriptContext } from '#imports'

export async function createShadowRootOverlay(ctx: ContentScriptContext, component: Component<{ rootElement: HTMLDivElement }>) {
  const ui = await createShadowRootUi(ctx, {
    name: 'nativemind-container',
    position: 'overlay',
    isolateEvents: true,
    mode: 'open',
    anchor: 'html',
    onMount(uiContainer, _shadow, shadowHost) {
      const rootElement = document.createElement('div')
      const toastRoot = document.createElement('div')
      uiContainer.appendChild(rootElement)
      uiContainer.appendChild(toastRoot)
      shadowHost.style.setProperty('position', 'fixed')
      shadowHost.style.setProperty('top', '0px')
      shadowHost.style.setProperty('left', '0px')
      shadowHost.style.setProperty('z-index', 'calc(infinity)')
      const pinia = createPinia()
      const app = createApp(component, { rootElement })
      app.use(i18n)
      app.use(initToast(toastRoot))
      app.use(pinia)
      app.mount(rootElement)
      return app
    },
    onRemove(app) {
      app?.unmount()
    },
  })
  return ui
}
