import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { enforceSyncQuota } from '@/tests/syncQuota'
import { OptionsStorage } from './OptionsStorage'
import { getOptionsStorageError } from './OptionsStorageError'

/**
 * OptionsStorage over fake chrome.storage. A split store is read with one
 * storage call and written with one, so neither can interleave with another
 * context's write. Watchers hear about a write that only touched a part's
 * chunks. An item that would still be over the per-item limit is refused
 * before anything is written, and the browser's quota errors become typed
 * OptionsStorageErrors while other failures pass through unchanged.
 */

interface Data {
  font: string
  list: string[]
}

function createStorage() {
  return new OptionsStorage<Data>({
    key: 'store',
    area: 'sync',
    parts: ['list'],
  })
}

function storageProblem(error: unknown) {
  return getOptionsStorageError(error)?.problem
}

describe('OptionsStorage', () => {
  it('writes in one call and reads in one call', async () => {
    const storage = createStorage()
    const set = vi.spyOn(fakeBrowser.storage.sync, 'set')
    const get = vi.spyOn(fakeBrowser.storage.sync, 'get')
    const envelope = { data: { font: 'serif', list: ['a', 'b'] }, version: 2 }

    await storage.write(envelope)
    expect(set).toHaveBeenCalledTimes(1)
    get.mockClear()

    expect(await storage.read()).toEqual(envelope)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('tells watchers about a write that changed only a part', async () => {
    const storage = createStorage()
    await storage.write({ data: { font: 'serif', list: ['a'] }, version: 2 })
    const listener = vi.fn()
    storage.watch(listener)

    await createStorage().write({
      data: { font: 'serif', list: ['a', 'b'] },
      version: 2,
    })

    await vi.waitFor(() => {
      expect(listener).toHaveBeenLastCalledWith({
        data: { font: 'serif', list: ['a', 'b'] },
        version: 2,
      })
    })
  })

  it('refuses an item still over the per-item limit without writing', async () => {
    const storage = createStorage()
    const set = vi.spyOn(fakeBrowser.storage.sync, 'set')

    const error = await storage
      .write({ data: { font: 'x'.repeat(9000), list: [] }, version: 2 })
      .catch((reason: unknown) => reason)

    expect(storageProblem(error)).toBe('itemTooLarge')
    expect(set).not.toHaveBeenCalled()
  })

  it('reports a full sync area as storeFull', async () => {
    enforceSyncQuota()
    await fakeBrowser.storage.sync.set({ filler: 'x'.repeat(8000) })
    for (let index = 0; index < 11; index++) {
      await fakeBrowser.storage.sync.set({
        [`filler${index}`]: 'x'.repeat(8000),
      })
    }

    const error = await createStorage()
      .write({ data: { font: 'serif', list: ['y'.repeat(9000)] }, version: 2 })
      .catch((reason: unknown) => reason)

    expect(storageProblem(error)).toBe('storeFull')
  })

  it.each([
    ['Resource::kQuotaBytesPerItem quota exceeded', 'itemTooLarge'],
    ['QUOTA_BYTES quota exceeded', 'storeFull'],
    ['Resource::kMaxItems quota exceeded', 'storeFull'],
    [
      'This request exceeds the MAX_WRITE_OPERATIONS_PER_MINUTE quota.',
      'writeRateLimited',
    ],
    [
      'QuotaExceededError: storage.sync API call exceeded its quota limitations.',
      'storeFull',
    ],
  ])('classifies "%s" as %s', async (message, problem) => {
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValue(
      new Error(message)
    )

    const error = await createStorage()
      .write({ data: { font: 'serif', list: [] }, version: 2 })
      .catch((reason: unknown) => reason)

    expect(storageProblem(error)).toBe(problem)
  })

  it('passes any other write failure through unchanged', async () => {
    const failure = new Error('IO error')
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValue(failure)

    await expect(
      createStorage().write({ data: { font: 'serif', list: [] }, version: 2 })
    ).rejects.toBe(failure)
  })
})
