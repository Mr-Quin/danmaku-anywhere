import { Mutex } from 'async-mutex'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { container } from '../ioc'
import { getSelfDomain } from './getSelfDomain'

const mutex = new Mutex()

// Monotonic per-SW-instance counter for DNR rule IDs; guarded by the mutex.
// `undefined` triggers a one-time prime from getSessionRules: on cold start
// or after an MV3 service-worker restart, persisted session rules from a
// prior instance still live in chrome, and starting from 0 would collide.
// Same prime happens when we near MAX_NUMBER_OF_SESSION_RULES (~5000).
let nextRuleIdCounter: number | undefined
const MAX_DNR_SESSION_RULES = 4500

async function primeCounterFromExisting(): Promise<number> {
  const existing = await chrome.declarativeNetRequest.getSessionRules()
  return existing.reduce((m, r) => Math.max(m, r.id), 0)
}

export async function setSessionHeader(
  matchUrl: string,
  headers: Record<string, string>
) {
  const release = await mutex.acquire()
  let nextRuleId: number
  try {
    if (
      nextRuleIdCounter === undefined ||
      nextRuleIdCounter >= MAX_DNR_SESSION_RULES
    ) {
      nextRuleIdCounter = await primeCounterFromExisting()
    }
    nextRuleIdCounter += 1
    nextRuleId = nextRuleIdCounter
    const extensionOptionsService = container.get(ExtensionOptionsService)
    const options = await extensionOptionsService.get()

    await chrome.declarativeNetRequest.updateSessionRules({
      addRules: [
        {
          id: nextRuleId,
          action: {
            type: 'modifyHeaders',
            requestHeaders: Object.entries(headers).map(([header, value]) => ({
              header,
              operation: 'set',
              value,
            })),
          },
          condition: {
            urlFilter: `|${matchUrl}`,
            resourceTypes: ['xmlhttprequest'],
            initiatorDomains:
              options.restrictInitiatorDomain !== false
                ? [getSelfDomain()]
                : undefined,
          },
        },
      ],
    })
  } finally {
    release()
  }

  async function removeRule() {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [nextRuleId],
    })
  }

  return {
    removeRule,
    async [Symbol.asyncDispose]() {
      await removeRule()
    },
  }
}
