import { browser } from "wxt/browser";

export function registerRewriteOriginRule() {
  // 一个固定 ID，方便热重载时先删后加
  const RULE_ID = 1;
  const TARGET_ORIGIN = "http://localhost";
  const URL_FILTER = /http:\/\/(127.0.0.1|localhost)/;

  browser.runtime.onInstalled.addListener(() => {
    // 每次安装/更新都重置规则
    browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID],
      addRules: [
        {
          id: RULE_ID,
          priority: 1,
          action: {
            type: browser.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            requestHeaders: [
              {
                header: "Origin",
                operation: browser.declarativeNetRequest.HeaderOperation.SET, // 也可用 'remove'
                value: TARGET_ORIGIN,
              },
            ],
          },
          condition: {
            regexFilter: URL_FILTER.source,
            initiatorDomains: [browser.runtime.id],
            resourceTypes: [
              browser.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            ],
          },
        },
      ],
    });

    console.log("Origin‑rewrite rule registered");
  });
}
