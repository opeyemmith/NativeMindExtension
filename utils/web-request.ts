import { browser } from 'wxt/browser'

import logger from '@/utils/logger'

const log = logger.child('web-request')
// 一个固定 ID，方便热重载时先删后加
const RULE_ID_REMOVE_ORIGIN = 1
const RULE_ID_REMOVE_DISPOSITION = 2

export function registerDeclarativeNetRequestRule() {
  const URL_FILTER = /http:\/\/(127.0.0.1|localhost)/
  const { resolve, promise } = Promise.withResolvers<void>()

  const timeout = setTimeout(() => {
    log.warn('Origin-rewrite rule timeout')
    resolve()
  }, 1000)

  browser.runtime.onInstalled.addListener(async () => {
    // 每次安装/更新都重置规则
    log.debug('Registering origin-rewrite rule', browser.runtime.id)
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID_REMOVE_ORIGIN],
      addRules: [
        {
          id: RULE_ID_REMOVE_ORIGIN,
          priority: 1,
          action: {
            type: browser.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            requestHeaders: [
              {
                header: 'Origin',
                operation: browser.declarativeNetRequest.HeaderOperation.REMOVE,
              },
            ],
          },
          condition: {
            regexFilter: URL_FILTER.source,
            initiatorDomains: [browser.runtime.id],
            resourceTypes: [browser.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
          },
        },
      ],
    })

    log.debug('Origin‑rewrite rule registered')
    clearTimeout(timeout)
    resolve()
  })

  return promise
}

export async function removeDispositionForTabId(tabId: number) {
  const { resolve, promise } = Promise.withResolvers<void>()

  const timeout = setTimeout(() => {
    log.warn('content-disposition-remove rule timeout')
    resolve()
  }, 5000)

  log.debug('Registering content-disposition-remove rule', browser.runtime.id)
  browser.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [RULE_ID_REMOVE_DISPOSITION],
    addRules: [
      {
        id: RULE_ID_REMOVE_DISPOSITION,
        priority: 1,
        action: {
          type: browser.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: 'content-disposition',
              operation: browser.declarativeNetRequest.HeaderOperation.REMOVE,
            },
          ],
        },
        condition: {
          tabIds: [tabId],
          resourceTypes: [browser.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      },
    ],
  }).then(() => {
    log.debug('content-disposition-remove rule registered for tab', tabId, browser.runtime.lastError)
    clearTimeout(timeout)
    resolve()
  }).catch((error) => {
    log.error('Failed to register content-disposition-remove rule', error)
    clearTimeout(timeout)
    resolve()
  })

  return promise
}
