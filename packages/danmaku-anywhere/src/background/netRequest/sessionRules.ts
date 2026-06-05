import { Mutex } from 'async-mutex'

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

// Allocates a collision-free session rule id and installs the rule built from
// it. All session DNR rules share this single counter so independent callers
// (request-header rewrites, media CORS bypass) never hand out the same id.
export async function addSessionRule(
  buildRule: (id: number) => chrome.declarativeNetRequest.Rule
): Promise<SessionRuleHandle> {
  const release = await mutex.acquire()
  let ruleId: number
  try {
    if (
      nextRuleIdCounter === undefined ||
      nextRuleIdCounter >= MAX_DNR_SESSION_RULES
    ) {
      nextRuleIdCounter = await primeCounterFromExisting()
    }
    nextRuleIdCounter += 1
    ruleId = nextRuleIdCounter
    await chrome.declarativeNetRequest.updateSessionRules({
      addRules: [buildRule(ruleId)],
    })
  } finally {
    release()
  }

  return {
    ruleId,
    removeRule: () => removeSessionRule(ruleId),
    async [Symbol.asyncDispose]() {
      await removeSessionRule(ruleId)
    },
  }
}
