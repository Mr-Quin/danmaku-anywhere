import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { enforceSyncQuota } from '@/tests/syncQuota'
import { OptionsStorage } from './OptionsStorage'
import { OptionsStorageError } from './OptionsStorageError'

/**
 * OptionsStorage over fake chrome.storage. A split store is read with one
 * storage call and written with one, so neither can interleave with another
 * context's write, and it goes back to one item once it fits again. Watchers
 * hear about a write that only touched a part's chunks once the store reads
 * whole again. An item that would still be over the per-item limit is refused
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
  return error instanceof OptionsStorageError ? error.problem : undefined
}

describe('OptionsStorage', () => {
  it('writes a split store in one call and reads it in one call', async () => {
    const storage = createStorage()
    const set = vi.spyOn(fakeBrowser.storage.sync, 'set')
    const get = vi.spyOn(fakeBrowser.storage.sync, 'get')
    const envelope = {
      data: { font: 'serif', list: ['a'.repeat(5000), 'b'.repeat(5000)] },
      version: 2,
    }

    await storage.write(envelope)
    expect(set).toHaveBeenCalledTimes(1)
    get.mockClear()

    expect(await storage.read()).toEqual(envelope)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('goes back to one item once the store fits again', async () => {
    const storage = createStorage()
    await storage.write({
      data: { font: 'serif', list: ['a'.repeat(9000)] },
      version: 2,
    })

    await storage.write({ data: { font: 'serif', list: ['a'] }, version: 2 })

    const stored = await fakeBrowser.storage.sync.get(null)
    expect(stored).toEqual({
      store: { data: { font: 'serif', list: ['a'] }, version: 2 },
      'store.list.0': '',
      'store.list.1': '',
    })
    expect(await storage.read()).toEqual({
      data: { font: 'serif', list: ['a'] },
      version: 2,
    })
  })

  it('tells watchers about a write that changed only chunks, once it reads whole', async () => {
    const storage = createStorage()
    const big = 'a'.repeat(9000)
    await storage.write({ data: { font: 'serif', list: [big] }, version: 2 })
    const listener = vi.fn()
    storage.watch(listener)

    const lastChunk = (await fakeBrowser.storage.sync.get('store.list.1'))[
      'store.list.1'
    ]
    await fakeBrowser.storage.sync.set({ 'store.list.1': 'torn' })
    await fakeBrowser.storage.sync.set({ 'store.list.1': lastChunk })

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith({
        data: { font: 'serif', list: [big] },
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

    expect(storageProblem(error)).toBe('options.itemTooLarge')
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

    expect(storageProblem(error)).toBe('options.storeFull')
  })

  it.each([
    ['Resource::kQuotaBytesPerItem quota exceeded', 'options.itemTooLarge'],
    ['QUOTA_BYTES quota exceeded', 'options.storeFull'],
    ['Resource::kMaxItems quota exceeded', 'options.storeFull'],
    [
      'This request exceeds the MAX_WRITE_OPERATIONS_PER_MINUTE quota.',
      'options.writeRateLimited',
    ],
    [
      'QuotaExceededError: storage.sync API call exceeded its quota limitations.',
      'options.storeFull',
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
