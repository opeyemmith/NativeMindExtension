import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing'
import { storage } from 'wxt/utils/storage'

import { getUserConfig } from '.'

describe('user config', () => {
  beforeEach(() => {
    // See https://webext-core.aklinker1.io/fake-browser/reseting-state
    fakeBrowser.reset()
  })

  it('should be a reactive object', async () => {
    const userConfig = await getUserConfig()
    const r1 = userConfig.llm.model.toRef()
    const r2 = userConfig.llm.model.toRef()
    r1.value = 'test-model'
    expect(r2.value).toBe('test-model')
    const localValue = await storage.getItem(userConfig.llm.model.areaKey)
    expect(localValue).toBe('test-model')
  })
})
