import { Mutex } from 'async-mutex'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { container } from '../ioc'
import { getSelfDomain } from './getSelfDomain'

const mutex = new Mutex()

// Monotonic per-session counter for DNR rule IDs. Reading from
// `chrome.declarativeNetRequest.getSessionRules()` was racy: rules added
// by an earlier setSessionHeader call could be removed by its caller
// concurrently with another setSessionHeader running, leaving a gap that
// a later call would happily reuse while the older `updateSessionRules`
// was still draining. A monotonic counter guarded by the mutex never
// hands out the same id twice for the session.
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
