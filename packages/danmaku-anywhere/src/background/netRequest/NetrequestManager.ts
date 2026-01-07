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
          removeRuleIds: rules.map((r) => r.id),
          addRules: rules,
        })
        this.logger.debug('Updated net request dynamic rules')
      } catch (e) {
        this.logger.error('Failed to update net request dynamic rules', e)
      }
    })

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.aiProviderConfig) {
        this.handleConfigChange(changes.aiProviderConfig.newValue)
      }
    })

    // Initial sync on startup
    this.syncInitialRules()
  }

  private async syncInitialRules() {
    try {
      const result = await chrome.storage.sync.get('aiProviderConfig')
      if (result.aiProviderConfig) {
        await this.handleConfigChange(result.aiProviderConfig)
      }
    } catch (e) {
      this.logger.error('Failed to sync initial AI rules', e)
    }
  }

  private async handleConfigChange(storageValue: any) {
    if (!storageValue?.data) return
    const configs = storageValue.data as any[]
    const domains = new Set<string>()

    for (const config of configs) {
      // We only care about OpenAI compatible providers (or any with baseUrl)
      // And they should be enabled (if we had an enabled flag, currently we blindly add?)
      // Schema has `enabled`.
      if (config.enabled === false) continue

      const baseUrl = config.settings?.baseUrl
      if (typeof baseUrl === 'string' && baseUrl) {
        try {
          const url = new URL(baseUrl)
          if (url.protocol.startsWith('http')) {
            domains.add(url.hostname)
          }
        } catch {
          // ignore invalid urls
        }
      }
    }

    await this.updateAiProviderRules(Array.from(domains))
  }

  async updateAiProviderRules(domains: string[]) {
    this.logger.debug('Updating AI provider rules', { domains })
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
    const aiRules = existingRules.filter((r) => r.id >= 1000 && r.id < 2000)
    const removeRuleIds = aiRules.map((r) => r.id)

    const addRules: chrome.declarativeNetRequest.Rule[] = domains.map(
      (domain, index) => ({
        id: 1000 + index,
        priority: 1,
        action: {
          type: RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: 'Origin',
              operation: HeaderOperation.REMOVE,
            },
          ],
        },
        condition: {
          requestDomains: [domain],
          resourceTypes: [ResourceType.XMLHTTPREQUEST],
        },
      })
    )

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    })
  }

  async getRules() {
    return rules
  }

  async getEnabledStaticRulesets() {
    return chrome.declarativeNetRequest.getEnabledRulesets()
  }
}
