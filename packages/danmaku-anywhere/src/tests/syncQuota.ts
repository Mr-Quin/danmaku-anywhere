import { fakeBrowser } from '@webext-core/fake-browser'
import { vi } from 'vitest'

const PER_ITEM = 8192
const TOTAL = 102_400
const MAX_ITEMS = 512

const encoder = new TextEncoder()

// Chrome's JSON writer escapes these where JSON.stringify does not.
function chromeJson(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003C')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}

export function chromeItemBytes(key: string, value: unknown): number {
  return encoder.encode(key).length + encoder.encode(chromeJson(value)).length
}

// Makes the fake sync area reject a write the way Chrome does: the whole call
// fails, with Chrome's message, when any item in it is over the per-item
// limit or the area would end up over its byte or item limit.
export function enforceSyncQuota() {
  const sync = fakeBrowser.storage.sync
  const set = sync.set.bind(sync)
  return vi.spyOn(sync, 'set').mockImplementation(async (items) => {
    for (const [key, value] of Object.entries(items)) {
      if (chromeItemBytes(key, value) > PER_ITEM) {
        throw new Error('Resource::kQuotaBytesPerItem quota exceeded')
      }
    }
    const after = { ...(await sync.get(null)), ...items }
    if (Object.keys(after).length > MAX_ITEMS) {
      throw new Error('Resource::kMaxItems quota exceeded')
    }
    const total = Object.entries(after).reduce((sum, [key, value]) => {
      return sum + chromeItemBytes(key, value)
    }, 0)
    if (total > TOTAL) {
      throw new Error('Resource::kQuotaBytes quota exceeded')
    }
    return set(items)
  })
}
