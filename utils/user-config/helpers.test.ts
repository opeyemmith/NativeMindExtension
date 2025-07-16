import { afterEach } from 'node:test'

import { beforeEach, describe, expect, it } from 'vitest'
import { storage } from 'wxt/utils/storage'

import { resetFakeBrowser, resetFakeEntrypoint } from '@/tests/utils/fake-browser'

import { ByteSize } from '../sizes'

describe('user config', () => {
  beforeEach(() => {
    resetFakeEntrypoint('background')
  })

  afterEach(() => {
    resetFakeEntrypoint()
  })

  it('should be a reactive object', async () => {
    resetFakeBrowser()
    // export the raw function for testing to avoid side effects(cache)
    const { _getUserConfig: getUserConfig } = await import('./index')
    const userConfig = await getUserConfig()
    const r1 = userConfig.llm.model.toRef()
    const r2 = userConfig.llm.model.toRef()
    r1.value = 'test-model'
    expect(r2.value).toBe('test-model')
    const localValue = await storage.getItem(userConfig.llm.model.areaKey)
    expect(localValue).toBe('test-model')
  })

  it('enableNumCtx should be false when system memory is less than 8GB', async () => {
    resetFakeBrowser({
      fakeSystemMemory: {
        capacity: ByteSize.fromGB(4).toBytes(),
        availableCapacity: ByteSize.fromGB(4).toBytes(),
        usage: ByteSize.fromGB(0).toBytes(),
      },
    })
    const { _getUserConfig: getUserConfig } = await import('./index')
    const userConfig = await getUserConfig()
    expect(userConfig.llm.enableNumCtx.get()).toBe(false)
  })

  it('enableNumCtx should be true when system memory is greater than 8GB', async () => {
    resetFakeBrowser({
      fakeSystemMemory: {
        capacity: ByteSize.fromGB(16).toBytes(),
        availableCapacity: ByteSize.fromGB(16).toBytes(),
        usage: ByteSize.fromGB(0).toBytes(),
      },
    })
    const { _getUserConfig: getUserConfig } = await import('./index')
    const userConfig = await getUserConfig()
    expect(userConfig.llm.enableNumCtx.get()).toBe(true)
  })
})
