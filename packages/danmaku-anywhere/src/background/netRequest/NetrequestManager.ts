import { injectable } from 'inversify'
import { Logger } from '@/background/backgroundLogger'

// these enums are not defined in Firefox, so we need to define them ourselves
enum RuleActionType {
  BLOCK = 'block',
  REDIRECT = 'redirect',
  ALLOW = 'allow',
  UPGRADE_SCHEME = 'upgradeScheme',
  MODIFY_HEADERS = 'modifyHeaders',
  ALLOW_ALL_REQUESTS = 'allowAllRequests',
}

enum HeaderOperation {
  APPEND = 'append',
  SET = 'set',
  REMOVE = 'remove',
}

enum ResourceType {
  MAIN_FRAME = 'main_frame',
  SUB_FRAME = 'sub_frame',
  STYLESHEET = 'stylesheet',
  SCRIPT = 'script',
  IMAGE = 'image',
  FONT = 'font',
  OBJECT = 'object',
  XMLHTTPREQUEST = 'xmlhttprequest',
  PING = 'ping',
  CSP_REPORT = 'csp_report',
  MEDIA = 'media',
  WEBSOCKET = 'websocket',
  OTHER = 'other',
}

const getSelfDomain = () => {
  const url = chrome.runtime.getURL('')
  try {
    return new URL(url).host
  } catch (e) {
    Logger.error('Failed to get self domain', e)
    return chrome.runtime.id
  }
}

const selfDomain = getSelfDomain()

const rules: chrome.declarativeNetRequest.Rule[] = [
  // Set origin and referer to bilibili.com
  {
    id: 1,
    action: {
      type: RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          header: 'Referer',
          operation: HeaderOperation.SET,
          value: 'https://www.bilibili.com',
        },
        {
          header: 'Origin',
          operation: HeaderOperation.SET,
          value: 'https://www.bilibili.com',
        },
      ],
    },
    condition: {
      excludedInitiatorDomains: ['bilibili.com'],
      urlFilter: '|https://*.bilibili.com/',
      resourceTypes: [ResourceType.XMLHTTPREQUEST],
    },
  },
  // Set origin and referer to v.qq.com
  {
    id: 2,
    action: {
      type: RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          header: 'Referer',
          operation: HeaderOperation.SET,
          value: 'https://v.qq.com',
        },
        {
          header: 'Origin',
          operation: HeaderOperation.SET,
          value: 'https://v.qq.com',
        },
      ],
    },
    condition: {
      excludedInitiatorDomains: ['qq.com'],
      urlFilter: '|https://*.video.qq.com/',
      resourceTypes: [ResourceType.XMLHTTPREQUEST],
    },
  },
  // Set origin and referer to proxy
  {
    id: 3,
    action: {
      type: RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          header: 'Origin',
          operation: HeaderOperation.SET,
          value: import.meta.env.VITE_PROXY_ORIGIN,
        },
        {
          header: 'Referer',
          operation: HeaderOperation.SET,
          value: selfDomain,
        },
      ],
    },
    condition: {
      urlFilter: `|${import.meta.env.VITE_PROXY_URL}`,
      resourceTypes: [ResourceType.XMLHTTPREQUEST],
    },
  },
]

@injectable('Singleton')
export class NetRequestManager {
  setup() {
    chrome.runtime.onInstalled.addListener(async () => {
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: rules.map((r) => r.id),
          addRules: rules,
        })
        Logger.debug('Updated net request dynamic rules')
      } catch (e) {
        Logger.error('Failed to update net request dynamic rules', e)
      }
    })
  }
}
