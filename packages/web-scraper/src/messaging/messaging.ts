import type { SetHeaderRule } from '@danmaku-anywhere/extension-protocol'
import { Mutex } from 'async-mutex'
import { nextSessionRuleId } from './sessionRuleIds.js'

const headerRuleMutex = new Mutex()

// Other session rules (setSessionHeader, the media CORS bypass) can share the
// exact urlFilter, but only header rules cover main_frame.
function isHeaderRuleFor(
  rule: chrome.declarativeNetRequest.Rule,
  url: string
): boolean {
  return (
    rule.condition.urlFilter === `|${url}` &&
    rule.condition.resourceTypes?.includes('main_frame') === true
  )
}

function targetsSameTab(
  rule: chrome.declarativeNetRequest.Rule,
  tabId: number | undefined
): boolean {
  const tabIds = rule.condition.tabIds
  if (tabId === undefined) {
    return tabIds === undefined
  }
  return tabIds?.length === 1 && tabIds[0] === tabId
}

// tabId scopes the rule to the tab that asked for it. The rule forces
// Access-Control-Allow-Origin: *, so leaving it unscoped would hand every tab
// in the browser a CORS bypass for the matched url.
export const setRequestHeaderRule = async (
  headerRule: SetHeaderRule,
  tabId?: number
) => {
  return headerRuleMutex.runExclusive(() => {
    return installHeaderRule(headerRule, tabId)
  })
}

async function installHeaderRule(
  headerRule: SetHeaderRule,
  tabId: number | undefined
): Promise<void> {
  const existingRules = await chrome.declarativeNetRequest.getSessionRules()

  const prevRule = existingRules.find((rule) => {
    return isHeaderRuleFor(rule, headerRule.url) && targetsSameTab(rule, tabId)
  })

  const ruleId = await nextSessionRuleId()

  // biome-ignore lint/correctness/noUndeclaredVariables: browser is defined in firefox
  const isChrome = typeof browser === 'undefined'

  const resourceTypes: (
    | 'object'
    | 'main_frame'
    | 'sub_frame'
    | 'stylesheet'
    | 'xmlhttprequest'
    | 'csp_report'
    | 'font'
    | 'image'
    | 'ping'
    | 'script'
    | 'media'
    | 'websocket'
    | 'webbundle'
    | 'other'
    | 'webtransport'
  )[] = [
    'main_frame',
    'sub_frame',
    'stylesheet',
    'xmlhttprequest',
    'csp_report',
    'font',
    'image',
    'ping',
    'script',
    'object',
    'media',
    'websocket',
    'other',
  ]

  if (isChrome) {
    // not supported in Firefox
    resourceTypes.push('webtransport')
    resourceTypes.push('webbundle')
  }

  const headersToSet =
    headerRule.headers?.map(
      (h): chrome.declarativeNetRequest.ModifyHeaderInfo => {
        return {
          header: h.name,
          operation: 'set',
          value: h.value!,
        }
      }
    ) ?? []

  const requestHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = [
    ...headersToSet,
    {
      header: 'Referer',
      operation: 'set',
      value: headerRule.referer,
    },
  ]

  const action: chrome.declarativeNetRequest.RuleAction = {
    type: 'modifyHeaders',
    requestHeaders,
  }

  if (headerRule.origin) {
    requestHeaders.push({
      header: 'Origin',
      operation: 'set',
      value: headerRule.origin,
    })
    action.responseHeaders = [
      {
        header: 'Access-Control-Allow-Origin',
        operation: 'set',
        value: '*',
      },
    ]
  }

  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [
      {
        id: ruleId,
        action,
        condition: {
          urlFilter: `|${headerRule.url}`,
          resourceTypes: resourceTypes,
          tabIds: tabId === undefined ? undefined : [tabId],
        },
      },
    ],
    removeRuleIds: prevRule ? [prevRule.id] : [],
  })
}
