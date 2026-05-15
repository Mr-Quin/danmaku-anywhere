import { Mutex } from 'async-mutex'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { container } from '../ioc'
import { getSelfDomain } from './getSelfDomain'

const mutex = new Mutex()

// Monotonic per-session counter for DNR rule IDs; guarded by the mutex.
// Avoids the read-after-remove race that came with `getSessionRules + maxId + 1`.
let nextRuleIdCounter = 0

export async function setSessionHeader(
  matchUrl: string,
  headers: Record<string, string>
) {
  const release = await mutex.acquire()
  let nextRuleId: number
  try {
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
