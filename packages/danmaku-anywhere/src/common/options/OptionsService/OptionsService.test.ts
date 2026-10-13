import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { silentLogger } from '@/tests/silentLogger'
import { OptionsService } from './OptionsService'

/**
 * OptionsService over fake chrome.storage. Covers upgrade(): a read error or a
 * write error rejects and leaves the stored value alone, a migration that
 * throws still resets the store to defaults, and a store already at its latest
 * version is not written. Also covers isCurrent, readStoredUnblocked telling an
 * absent store from a stored empty list, onChange unsubscribing, and set/update
 * rejecting when the write fails.
 */

interface Counter {
  count: number
}

const KEY = 'testOptions'

type Readiness = Pick<ReadinessService, 'waitUntilReady'>

const readiness: Readiness = {
  waitUntilReady: () => Promise.resolve(),
}

function createCounterService(
  readiness: Readiness,
  upgradeToV2: (data: Counter) => Counter = (data) => ({
    count: data.count + 1,
  })
) {
  return new OptionsService<Counter>(
    readiness,
    KEY,
    { count: 0 },
    silentLogger,
    'local'
  )
    .version(1, { upgrade: (data) => data })
    .version(2, { upgrade: upgradeToV2 })
}

async function storeRaw(value: unknown) {
  await fakeBrowser.storage.local.set({ [KEY]: value })
}

async function readRaw() {
  const stored = await fakeBrowser.storage.local.get(KEY)
  return stored[KEY]
}

describe('OptionsService', () => {
  describe('upgrade', () => {
    it('writes defaults at the latest version when nothing is stored', async () => {
      const service = createCounterService(readiness)

      await service.upgrade()

      expect(await readRaw()).toEqual({ data: { count: 0 }, version: 2 })
    })

    it('migrates a stored value to the latest version', async () => {
      await storeRaw({ data: { count: 5 }, version: 1 })
      const service = createCounterService(readiness)

      await service.upgrade()

      expect(await readRaw()).toEqual({ data: { count: 6 }, version: 2 })
    })

    it('leaves a store already at the latest version unwritten', async () => {
      await storeRaw({ data: { count: 5 }, version: 2 })
      const service = createCounterService(readiness)
      const set = vi.spyOn(fakeBrowser.storage.local, 'set')

      await service.upgrade()

      expect(set).not.toHaveBeenCalled()
      expect(await readRaw()).toEqual({ data: { count: 5 }, version: 2 })
    })

    it('leaves a store written by a newer version unwritten', async () => {
      await storeRaw({ data: { count: 5, extra: true }, version: 3 })
      const service = createCounterService(readiness)

      await service.upgrade()

      expect(await readRaw()).toEqual({
        data: { count: 5, extra: true },
        version: 3,
      })
    })

    it('rejects on a read error and writes nothing', async () => {
      await storeRaw({ data: { count: 5 }, version: 1 })
      const service = createCounterService(readiness)
      vi.spyOn(fakeBrowser.storage.local, 'get').mockRejectedValue(
        new Error('IO error')
      )
      const set = vi.spyOn(fakeBrowser.storage.local, 'set')

      await expect(service.upgrade()).rejects.toThrow('IO error')

      expect(set).not.toHaveBeenCalled()
    })

    it('rejects on a write error and leaves the stored value instead of resetting it', async () => {
      await storeRaw({ data: { count: 5 }, version: 1 })
      const service = createCounterService(readiness)
      const set = vi
        .spyOn(fakeBrowser.storage.local, 'set')
        .mockRejectedValue(new Error('QUOTA_BYTES quota exceeded'))

      await expect(service.upgrade()).rejects.toThrow(
        'QUOTA_BYTES quota exceeded'
      )

      expect(set).toHaveBeenCalledTimes(1)
      set.mockRestore()
      expect(await readRaw()).toEqual({ data: { count: 5 }, version: 1 })
    })

    it('resets to defaults when a migration step throws', async () => {
      await storeRaw({ data: { count: 5 }, version: 1 })
      const service = createCounterService(readiness, () => {
        throw new Error('bad data')
      })

      await service.upgrade()

      expect(await readRaw()).toEqual({ data: { count: 0 }, version: 2 })
    })

    it('rejects when the reset after a throwing migration cannot be written', async () => {
      await storeRaw({ data: { count: 5 }, version: 1 })
      const service = createCounterService(readiness, () => {
        throw new Error('bad data')
      })
      vi.spyOn(fakeBrowser.storage.local, 'set').mockRejectedValue(
        new Error('QUOTA_BYTES quota exceeded')
      )

      await expect(service.upgrade()).rejects.toThrow(
        'QUOTA_BYTES quota exceeded'
      )
    })
  })

  describe('isCurrent', () => {
    it('is false when nothing is stored', async () => {
      const service = createCounterService(readiness)

      await expect(service.isCurrent()).resolves.toBe(false)
    })

    it('is false below the latest version', async () => {
      await storeRaw({ data: { count: 5 }, version: 1 })
      const service = createCounterService(readiness)

      await expect(service.isCurrent()).resolves.toBe(false)
    })

    it('is false for a value stored before versioning', async () => {
      await storeRaw({ data: { count: 5 } })
      const service = createCounterService(readiness)

      await expect(service.isCurrent()).resolves.toBe(false)
    })

    it('is true at the latest version', async () => {
      await storeRaw({ data: { count: 5 }, version: 2 })
      const service = createCounterService(readiness)

      await expect(service.isCurrent()).resolves.toBe(true)
    })

    it('is true above the latest version', async () => {
      await storeRaw({ data: { count: 5 }, version: 3 })
      const service = createCounterService(readiness)

      await expect(service.isCurrent()).resolves.toBe(true)
    })

    it('becomes true once upgrade has run', async () => {
      await storeRaw({ data: { count: 5 }, version: 1 })
      const service = createCounterService(readiness)

      await service.upgrade()

      await expect(service.isCurrent()).resolves.toBe(true)
    })
  })

  describe('onChange', () => {
    it('stops notifying once unsubscribed', async () => {
      const service = createCounterService(readiness)
      const seen: number[] = []
      const unsubscribe = service.onChange((data) => {
        seen.push(data.count)
      })

      await service.setUnblocked({ count: 1 })
      await vi.waitFor(() => {
        expect(seen).toContain(1)
      })
      unsubscribe()
      await service.setUnblocked({ count: 2 })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(seen).not.toContain(2)
    })
  })

  describe('readStoredUnblocked', () => {
    function createListService() {
      return new OptionsService<string[]>(
        readiness,
        KEY,
        ['default'],
        silentLogger,
        'local'
      ).version(1, { upgrade: (data) => data })
    }

    it('resolves undefined for an absent store', async () => {
      const service = createListService()

      await expect(service.readStoredUnblocked()).resolves.toBeUndefined()
      await expect(service.readUnblocked()).resolves.toEqual(['default'])
    })

    it('returns the stored envelope for a stored empty list', async () => {
      await storeRaw({ data: [], version: 1 })
      const service = createListService()

      await expect(service.readStoredUnblocked()).resolves.toEqual({
        data: [],
        version: 1,
      })
    })

    it('rejects on a read error', async () => {
      const service = createListService()
      vi.spyOn(fakeBrowser.storage.local, 'get').mockRejectedValue(
        new Error('IO error')
      )

      await expect(service.readStoredUnblocked()).rejects.toThrow('IO error')
    })
  })

  describe('writes', () => {
    beforeEach(async () => {
      await storeRaw({ data: { count: 5 }, version: 2 })
    })

    it('set rejects when the write fails', async () => {
      const service = createCounterService(readiness)
      vi.spyOn(fakeBrowser.storage.local, 'set').mockRejectedValue(
        new Error('QUOTA_BYTES quota exceeded')
      )

      await expect(service.set({ count: 9 })).rejects.toThrow(
        'QUOTA_BYTES quota exceeded'
      )
    })

    it('update rejects when the write fails', async () => {
      const service = createCounterService(readiness)
      vi.spyOn(fakeBrowser.storage.local, 'set').mockRejectedValue(
        new Error('QUOTA_BYTES quota exceeded')
      )

      await expect(service.update({ count: 9 })).rejects.toThrow(
        'QUOTA_BYTES quota exceeded'
      )
    })

    it('get rejects on a read error instead of returning defaults', async () => {
      const service = createCounterService(readiness)
      vi.spyOn(fakeBrowser.storage.local, 'get').mockRejectedValue(
        new Error('IO error')
      )

      await expect(service.get()).rejects.toThrow('IO error')
    })
  })
})
