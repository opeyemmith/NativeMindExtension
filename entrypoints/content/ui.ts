import { createPinia } from 'pinia'
import type { Component } from 'vue'
import { createApp } from 'vue'
import { browser } from 'wxt/browser'
import { ContentScriptContext } from 'wxt/utils/content-script-context'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { splitShadowRootCss } from 'wxt/utils/split-shadow-root-css'

import { initToast } from '@/composables/useToast'
import { FONT_FACE_CSS } from '@/utils/constants'
import { convertPropertiesIntoSimpleVariables, createStyleSheetByCssText, loadContentScriptCss, replaceFontFaceUrl, scopeStyleIntoShadowRoot } from '@/utils/css'
import { i18n } from '@/utils/i18n'

async function loadStyleSheet(shadowRoot: ShadowRoot) {
  const contentScriptCss = await loadContentScriptCss(import.meta.env.ENTRYPOINT)
  const fontFaceCss = await loadContentScriptCss(FONT_FACE_CSS)
  const { shadowCss, documentCss } = splitShadowRootCss(contentScriptCss)
  shadowRoot.adoptedStyleSheets.push(scopeStyleIntoShadowRoot(shadowCss))
  shadowRoot.adoptedStyleSheets.push(convertPropertiesIntoSimpleVariables(scopeStyleIntoShadowRoot(documentCss), true))
  // font-face can only be applied to the document, not the shadow root
  document.adoptedStyleSheets.push(replaceFontFaceUrl(createStyleSheetByCssText(fontFaceCss), (url) => browser.runtime.getURL(url as Parameters<typeof browser.runtime.getURL>[0])))
}

export async function createShadowRootOverlay(ctx: ContentScriptContext, component: Component<{ rootElement: HTMLDivElement }>) {
  const ui = await createShadowRootUi(ctx, {
    name: 'nativemind-container',
    position: 'overlay',
    isolateEvents: true,
    mode: 'open',
    anchor: 'html',
    async onMount(uiContainer, shadowRoot, shadowHost) {
      await loadStyleSheet(shadowRoot)
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
    async onRemove(app) {
      (await app)?.unmount()
    },
  })
  return ui
}
