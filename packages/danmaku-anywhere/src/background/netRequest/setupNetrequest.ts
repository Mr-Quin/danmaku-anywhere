export const setupNetRequest = () => {
  chrome.runtime.onInstalled.addListener(async () => {
    const rules = [
      // Set origin and referer to bilibili.com
      {
        id: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: 'Referer',
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: 'https://www.bilibili.com',
            },
            {
              header: 'Origin',
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: 'https://www.bilibili.com',
            },
          ],
        },
        condition: {
          domains: [chrome.runtime.id],
          urlFilter: '|https://*.bilibili.com/',
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          ],
        },
      },
      {
        id: 2,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: 'Referer',
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: 'https://v.qq.com',
            },
            {
              header: 'Origin',
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: 'https://v.qq.com',
            },
          ],
        },
        condition: {
          domains: [chrome.runtime.id],
          urlFilter: '|https://*.video.qq.com/',
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          ],
        },
      },
    ]

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((r) => r.id),
      addRules: rules,
    })
  })
}
