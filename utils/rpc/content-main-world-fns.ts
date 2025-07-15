import { TextStreamPart, ToolSet } from 'ai'
import EventEmitter from 'events'
import { browser } from 'wxt/browser'

import { toAsyncIter } from '../async'
import { logger } from '../logger'
import { SettingsScrollTarget } from '../scroll-targets'
import { getTabStore } from '../tab-store'
import { getUserConfig } from '../user-config'
import { c2bRpc } from '.'

const log = logger.child('main-world-fns')
const eventEmitter = new EventEmitter()

export type Events = {
  toast: (opts: { message: string, type?: 'info' | 'success' | 'error', duration?: number }) => void
}

export type EventKey = keyof Events

export function ping() {
  return 'pong'
}

async function generateTextInBackground(options: Parameters<typeof c2bRpc.generateText>[0]) {
  type Return = Awaited<ReturnType<typeof c2bRpc.generateTextAsync>>
  const { portName } = await c2bRpc.generateText(options)
  const port = browser.runtime.connect({ name: portName })
  return new Promise<Return>((resolve, reject) => {
    port.onMessage.addListener((message: Return) => {
      resolve(message)
    })
    port.onDisconnect.addListener(() => {
      reject(new Error('Port disconnected'))
    })
  })
}

export async function* streamTextInBackground(options: Parameters<typeof c2bRpc.streamText>[0]) {
  const { portName } = await c2bRpc.streamText(options)
  const port = browser.runtime.connect({ name: portName })
  const iter = toAsyncIter<TextStreamPart<ToolSet>>(
    (yieldData, done) => {
      port.onMessage.addListener((message: TextStreamPart<ToolSet>) => {
        if (message.type === 'error') {
          done(message.error)
          return
        }
        yieldData(message)
      })
      port.onDisconnect.addListener(() => {
        done()
      })
    },
    {
      firstDataTimeout: 60000,
      onTimeout: () => port.disconnect(), // disconnect to avoid connection leak
    },
  )
  yield* iter
}

export async function checkChromeAIPolyfillEnabled() {
  const userConfig = await getUserConfig()
  return userConfig.chromeAI.polyfill.enable.get()
}

export async function checkBackendModelReady() {
  const userConfig = await getUserConfig()
  try {
    if (userConfig.llm.endpointType.get() === 'ollama') {
      const modelList = await c2bRpc.getLocalModelList()
      return modelList.models.length > 0
    }
    else if (userConfig.llm.endpointType.get() === 'web-llm') {
      return c2bRpc.hasWebLLMModelInCache('Qwen3-0.6B-q4f16_1-MLC')
    }
  }
  catch (error) {
    log.debug('Error checking backend model', error)
    return false
  }
}

export async function toggleContainer(show?: boolean) {
  const tabStore = await getTabStore()
  if (show === undefined) {
    tabStore.showContainer.value = !tabStore.showContainer.value
  }
  else {
    tabStore.showContainer.value = show
  }
}

export async function toggleSetting(show?: boolean, scrollTarget?: SettingsScrollTarget) {
  const tabStore = await getTabStore()
  if (show === undefined) {
    tabStore.showSetting.value = {
      show: !tabStore.showSetting.value.show,
      scrollTarget: scrollTarget,
    }
  }
  else {
    tabStore.showSetting.value = {
      show: show,
      scrollTarget: scrollTarget,
    }
  }
}

export const contentFnsForMainWorld = {
  emit: <E extends keyof Events>(ev: E, ...args: Parameters<Events[E]>) => {
    eventEmitter.emit(ev, ...args)
  },
  ping,
  generateTextInBackground,
  checkBackendModelReady,
  checkChromeAIPolyfillEnabled,
  toggleContainer,
  toggleSetting,
}

export function registerContentScriptRpcEventFromMainWorld<E extends EventKey>(ev: E, fn: (...args: Parameters<Events[E]>) => void) {
  eventEmitter.on(ev, fn)
  return () => {
    eventEmitter.off(ev, fn)
  }
}

;(self as unknown as { contentFnsForMainWorld: unknown }).contentFnsForMainWorld = contentFnsForMainWorld
