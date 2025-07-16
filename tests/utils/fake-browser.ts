import { vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing'

import { ByteSize } from '@/utils/sizes'

interface FakeBrowserOptions {
  fakeSystemMemory?: {
    capacity: number
    availableCapacity: number
    usage: number
  }
}

export function resetFakeBrowser(options: FakeBrowserOptions = {}) {
  fakeBrowser.reset()
  const fakeSystemMemory = options.fakeSystemMemory ?? {
    capacity: ByteSize.fromGB(8).toBytes(),
    availableCapacity: ByteSize.fromGB(8).toBytes(),
    usage: ByteSize.fromGB(5).toBytes(),
  }
  // @ts-expect-error - for test env
  browser.system = {
    memory: {
      getInfo: () => fakeSystemMemory,
    },
  }
}

export function resetFakeEntrypoint(entrypoint?: string) {
  if (entrypoint === undefined) {
    vi.stubEnv('ENTRYPOINT', undefined)
  }
  else {
    vi.stubEnv('ENTRYPOINT', entrypoint)
  }
}
