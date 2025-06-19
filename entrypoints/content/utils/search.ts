import { browser } from 'wxt/browser'

import { toAsyncIter } from '@/utils/async'
import { c2bRpc } from '@/utils/rpc'
import { SearchingMessage } from '@/utils/search'

export interface SearchOptions {
  resultLimit?: number
  abortSignal?: AbortSignal
  engine: 'google'
}

export class SearchScraper {
  async* search(queryList: string[], options?: SearchOptions) {
    const { portName } = await c2bRpc.searchOnline(queryList, options)
    const port = browser.runtime.connect({ name: portName })
    options?.abortSignal?.addEventListener('abort', () => {
      port.disconnect()
    })
    const iter = toAsyncIter<SearchingMessage>((yieldData, done) => {
      const onMessage = (message: SearchingMessage) => {
        if (options?.abortSignal?.aborted) return done()
        yieldData(message)
      }
      options?.abortSignal?.addEventListener('abort', () => {
        port.onMessage.removeListener(onMessage)
        done()
      })
      const onDisconnect = () => {
        done()
        port.onDisconnect.removeListener(onDisconnect)
      }
      port.onMessage.addListener(onMessage)
      port.onDisconnect.addListener(onDisconnect)
    })
    yield* iter
  }
}
