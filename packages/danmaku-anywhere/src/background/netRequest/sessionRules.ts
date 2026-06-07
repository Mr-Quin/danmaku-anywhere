import { Mutex } from 'async-mutex'

const mutex = new Mutex()

// Monotonic DNR rule-id counter, mutex-guarded. Primed from existing rules on
// cold start / SW restart (persisted session rules would otherwise collide),
// and again near the cap.
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

// Shared id allocator for every session DNR rule, so independent callers
// (request-header rewrites, media CORS bypass) can't collide on ids.
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
