import { type BrowserContext, chromium, test as base } from '@playwright/test'
import path from 'path'

type Extended = {
  context: BrowserContext
  extensionId: string
  extension: {
    activateActiveTab: (() => Promise<void>)
  }
}

export const test = base.extend<Extended>({
  context: async ({ context: _ }, use) => {
    const pathToExtension = path.join(import.meta.dirname, '../../.output/chrome-mv3')
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers()
    if (!background)
      background = await context.waitForEvent('serviceworker')

    const extensionId = background.url().split('/')[2]
    await use(extensionId)
  },
  extension: async ({ context }, use) => {
    let [background] = context.serviceWorkers()
    if (!background)
      background = await context.waitForEvent('serviceworker')
    use({
      activateActiveTab: async () =>
        await background.evaluate(() => {
          // @ts-expect-error - this is a Chrome extension API
          chrome.tabs.query({ active: true }, (tabs) => {
            // @ts-expect-error - this is a Chrome extension API
            chrome.action.onClicked.dispatch(tabs[0])
          })
        }),
    })
  },
})
export const expect = test.expect
