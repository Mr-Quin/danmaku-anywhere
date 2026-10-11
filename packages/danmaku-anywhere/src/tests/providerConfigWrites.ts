import { fakeBrowser } from '@webext-core/fake-browser'
import { vi } from 'vitest'

// An empty list is what a store reset writes, so only a write that carries
// providers counts.
function writesProviders(items: Record<string, unknown>): boolean {
  const entry = items.providerConfig as { data?: unknown } | undefined
  return Array.isArray(entry?.data) && entry.data.length > 0
}

export function holdProviderWrites(): () => void {
  const { promise, resolve } = Promise.withResolvers<void>()
  const set = fakeBrowser.storage.sync.set.bind(fakeBrowser.storage.sync)
  vi.spyOn(fakeBrowser.storage.sync, 'set').mockImplementation(
    async (items) => {
      if (writesProviders(items)) {
        await promise
      }
      return set(items)
    }
  )
  return () => resolve()
}

export function failNextProviderWrite(error: Error): void {
  let failed = false
  const set = fakeBrowser.storage.sync.set.bind(fakeBrowser.storage.sync)
  vi.spyOn(fakeBrowser.storage.sync, 'set').mockImplementation(
    async (items) => {
      if (!failed && writesProviders(items)) {
        failed = true
        throw error
      }
      return set(items)
    }
  )
}

export async function isSettledAfterMicrotasks(
  promise: Promise<unknown>
): Promise<boolean> {
  let settled = false
  promise.then(
    () => {
      settled = true
    },
    () => {
      settled = true
    }
  )
  await new Promise((resolve) => setTimeout(resolve, 0))
  return settled
}
