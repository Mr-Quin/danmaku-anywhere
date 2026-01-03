import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'

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

function getSelfDomain() {
  const url = chrome.runtime.getURL('')
  try {
    return new URL(url).host
  } catch (e) {
    console.error('Failed to get self domain', e)
    return chrome.runtime.id
  }
}

const selfDomain = getSelfDomain()

const rules: chrome.declarativeNetRequest.Rule[] = [
  {
    id: 3, // keep old id
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
  private logger: ILogger

  constructor(@inject(LoggerSymbol) logger: ILogger) {
    this.logger = logger.sub('[NetRequestManager]')
  }

  setup() {
    chrome.runtime.onInstalled.addListener(async () => {
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [1, 2, 3],
          addRules: rules,
        })
        this.logger.debug('Updated net request dynamic rules')
      } catch (e) {
        this.logger.error('Failed to update net request dynamic rules', e)
      }
    })
  }

  async getRules() {
    return rules
  }

  async getEnabledStaticRulesets() {
    return chrome.declarativeNetRequest.getEnabledRulesets()
  }
}
