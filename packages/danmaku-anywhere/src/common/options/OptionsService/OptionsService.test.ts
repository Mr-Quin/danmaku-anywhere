import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EXTENSION_VERSION } from '@/common/constants'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { silentLogger } from '@/tests/silentLogger'
import { OptionsService } from './OptionsService'

/**
 * OptionsService over fake chrome.storage. Covers upgrade(): a read error or a
 * write error rejects and leaves the stored value alone, while a migration that
 * throws still resets the store to defaults. Also covers readStoredUnblocked
 * telling an absent store from a stored empty list, and set/update rejecting
 * when the write fails. transform() runs read, change and write as one queued
 * step, so concurrent transforms and sets never lose each other's changes.
 */

interface Counter {
  count: number
}

const KEY = 'testOptions'

async function readyReadiness() {
  await fakeBrowser.storage.local.set({
    lastVersion: { lastVersion: EXTENSION_VERSION },
  })
  const readiness = new ReadinessService(silentLogger)
  await readiness.waitUntilReady()
  return readiness
}

function createCounterService(
  readiness: ReadinessService,
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
  let readiness: ReadinessService

  beforeEach(async () => {
    readiness = await readyReadiness()
  })

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

  describe('transform', () => {
    beforeEach(async () => {
      await storeRaw({ data: { count: 5 }, version: 2 })
    })

    it('writes what the change returns at the stored version', async () => {
      const service = createCounterService(readiness)

      const result = await service.transform((data) => ({
        count: data.count * 2,
      }))

      expect(result).toEqual({ count: 10 })
      expect(await readRaw()).toEqual({ data: { count: 10 }, version: 2 })
    })

    it('runs concurrent transforms one after another', async () => {
      const service = createCounterService(readiness)

      await Promise.all([
        service.transform(async (data) => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          return { count: data.count + 1 }
        }),
        service.transform((data) => ({ count: data.count + 10 })),
      ])

      expect(await readRaw()).toEqual({ data: { count: 16 }, version: 2 })
    })

    it('does not let a set land between the read and the write', async () => {
      const service = createCounterService(readiness)

      const transformed = service.transform(async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        return { count: data.count + 1 }
      })
      const set = service.set({ count: 100 })
      await Promise.all([transformed, set])

      expect(await readRaw()).toEqual({ data: { count: 100 }, version: 2 })
    })

    it('writes nothing when the change throws', async () => {
      const service = createCounterService(readiness)
      const setSpy = vi.spyOn(fakeBrowser.storage.local, 'set')

      await expect(
        service.transform(() => {
          throw new Error('not allowed')
        })
      ).rejects.toThrow('not allowed')
      expect(setSpy).not.toHaveBeenCalled()
      expect(await readRaw()).toEqual({ data: { count: 5 }, version: 2 })
    })

    it('skips the write when the change returns the data it was given', async () => {
      const service = createCounterService(readiness)
      const setSpy = vi.spyOn(fakeBrowser.storage.local, 'set')

      await service.transform((data) => data)

      expect(setSpy).not.toHaveBeenCalled()
    })
  })
})
