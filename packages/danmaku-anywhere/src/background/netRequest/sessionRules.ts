import { nextSessionRuleId } from '@danmaku-anywhere/web-scraper'

export interface SessionRuleHandle {
  ruleId: number
  removeRule: () => Promise<void>
  [Symbol.asyncDispose](): Promise<void>
}

export async function removeSessionRule(ruleId: number): Promise<void> {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ruleId],
  })
}

export async function addSessionRule(
  buildRule: (id: number) => chrome.declarativeNetRequest.Rule
): Promise<SessionRuleHandle> {
  const ruleId = await nextSessionRuleId()
  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [buildRule(ruleId)],
  })

  return {
    ruleId,
    removeRule: () => removeSessionRule(ruleId),
    async [Symbol.asyncDispose]() {
      await removeSessionRule(ruleId)
    },
  }
}
