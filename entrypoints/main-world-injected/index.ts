import { defineContentScript } from 'wxt/utils/define-content-script'

import { logger } from '@/utils/logger'

import { exposeToGlobal, generateText, ping, polyfillForBuiltInAI } from './utils'

export default defineContentScript({
  matches: ['*://*/*'],
  world: 'MAIN',
  runAt: 'document_start',
  registration: 'manifest',
  main() {
    logger.debug('main world script loaded')
    polyfillForBuiltInAI()
    exposeToGlobal({
      __NATIVEMIND: {
        ping,
        generateText,
      },
    })
  },
})
