import { type BrowserContext, chromium, Page, test as base } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { ollamaPsResponse } from './mock-responses/ollama/ps'
import { ollamaTagsResponse } from './mock-responses/ollama/tags'

type Extended = {
  context: BrowserContext
  extensionId: string
  extension: {
    activateActiveTab: (() => Promise<void>)
  }
}

const ALLOWED_ENV = ['production', 'beta', 'development'] as const
const TEST_ENV = (process.env.TEST_ENV || 'production') as typeof ALLOWED_ENV[number]
if (!ALLOWED_ENV.includes(TEST_ENV)) {
  throw new Error(`Invalid TEST_ENV: ${TEST_ENV}. Allowed values are: ${ALLOWED_ENV.join(', ')}`)
}
const DIR_MAPPING = {
  production: '',
  beta: '-beta',
  development: '-dev',
} satisfies Record<typeof ALLOWED_ENV[number], string>

const pathToExtension = path.join(import.meta.dirname, `../../.output/chrome-mv3${DIR_MAPPING[TEST_ENV]}`)
if (fs.existsSync(pathToExtension) === false) {
  throw new Error(`Extension path does not exist: ${pathToExtension}. Please build the extension first.`)
}

export const test = base.extend<Extended>({
  context: async ({ context: _ }, use) => {
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

interface OllamaMockOptions {
  chatResponse?: string
}

// TODO: support api mocking in background.js
export const mockOllamaAPI = (page: Page, options: OllamaMockOptions) => {
  page.route('http://localhost:11434/api/tags', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify(ollamaTagsResponse),
    })
  })
  page.route('http://localhost:11434/api/ps', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify(ollamaPsResponse),
    })
  })
  if (options.chatResponse) {
    page.route('http://localhost:11434/api/chat', (route) => {
      route.fulfill({
        status: 200,
        body: options.chatResponse,
      })
    })
  }
}
