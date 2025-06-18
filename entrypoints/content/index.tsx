import '@/utils/polyfill'
import { Suspense } from 'vue'
import App from './App.vue'
import { createShadowRootOverlay } from './ui'
import 'tailwindcss/index.css'
import './utils/time'
import './style.css'
import RootProvider from './components/RootProvider.vue'

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
