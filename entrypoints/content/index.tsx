import '@/utils/polyfill'
import 'tailwindcss/index.css'
import './utils/time'
import './style.css'

import { Suspense } from 'vue'
import { defineContentScript } from 'wxt/utils/define-content-script'

import App from './App.vue'
import RootProvider from './components/RootProvider.vue'
import { createShadowRootOverlay } from './ui'

export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui',
  runAt: 'document_start',
  async main(ctx) {
    const ui = await createShadowRootOverlay(ctx, ({ rootElement }) => {
      rootElement.classList.add('font-inter', 'nativemind-style-boundary')
      return (
        <Suspense>
          <RootProvider rootElement={rootElement}>
            <App />
          </RootProvider>
        </Suspense>
      )
    })
    ui.mount()
  },
})
