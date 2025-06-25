import { expect, test } from './utils'

test('click action button', async ({ page, extension }) => {
  const containerSelector = '[data-testid="nativemind-container"]'
  const sideContainerSelector = '[data-testid="side-container"]'

  await page.goto('https://example.com')

  await page.waitForSelector(containerSelector, { timeout: 10000, state: 'attached' })
  await extension.activateActiveTab()

  await page.waitForSelector(sideContainerSelector, { timeout: 5000 })
  const isVisible = await page.isVisible(sideContainerSelector)
  expect(isVisible).toBeTruthy()
})
