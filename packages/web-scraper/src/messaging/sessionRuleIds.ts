import { Mutex } from 'async-mutex'

const mutex = new Mutex()

let lastRuleId: number | undefined

// Every session DNR rule in the extension must take its id from here. Session
// rules outlive a service worker restart, so the counter starts above whatever
// ids are already installed.
export async function nextSessionRuleId(): Promise<number> {
  return mutex.runExclusive(async () => {
    if (lastRuleId === undefined) {
      const existing = await chrome.declarativeNetRequest.getSessionRules()
      lastRuleId = existing.reduce((max, rule) => Math.max(max, rule.id), 0)
    }
    lastRuleId += 1
    return lastRuleId
  })
}
