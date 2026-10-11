import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ExtStorageService } from './ExtStorageService'

/**
 * ExtStorageService wraps one chrome.storage key. Covers read/set/delete/clear
 * against fake storage, local and cross-context subscriber notification, and
 * that a failing storage API rejects instead of looking like an absent key or a
 * successful write, with no subscriber told about a write that did not land.
 */

describe('ExtStorageService', () => {
  let service: ExtStorageService<string>

  beforeEach(() => {
    service = new ExtStorageService('testKey', { storageType: 'local' })
  })

  describe('read', () => {
    test('returns the stored value for an existing key', async () => {
      await fakeBrowser.storage.local.set({ testKey: 'testValue' })

      await expect(service.read()).resolves.toBe('testValue')
    })

    test('returns undefined for a missing key', async () => {
      await expect(service.read()).resolves.toBeUndefined()
    })
  })

  describe('set', () => {
    test('persists the value and notifies subscribers', async () => {
      const listener = vi.fn()
      service.subscribe(listener)

      await service.set('testValue')

      expect(await fakeBrowser.storage.local.get('testKey')).toEqual({
        testKey: 'testValue',
      })
      expect(listener).toHaveBeenCalledWith('testValue')
    })
  })

  describe('delete', () => {
    test('removes the key and notifies subscribers', async () => {
      await fakeBrowser.storage.local.set({
        testKey: 'testValue',
        other: 'keep',
      })
      const listener = vi.fn()
      service.subscribe(listener)

      await service.delete()

      expect(await fakeBrowser.storage.local.get(null)).toEqual({
        other: 'keep',
      })
      expect(listener).toHaveBeenCalledWith(undefined)
    })
  })

  describe('clearStorage', () => {
    test('clears all storage and notifies subscribers', async () => {
      await fakeBrowser.storage.local.set({
        testKey: 'testValue',
        other: 'gone',
      })
      const listener = vi.fn()
      service.subscribe(listener)

      await service.clearStorage()

      expect(await fakeBrowser.storage.local.get(null)).toEqual({})
      expect(listener).toHaveBeenCalledWith(undefined)
    })
  })

  describe('unsubscribe', () => {
    test('stops notifying a removed listener', async () => {
      const listener = vi.fn()
      service.subscribe(listener)
      service.unsubscribe(listener)

      await service.set('testValue')

      expect(listener).not.toHaveBeenCalled()
    })
  })

  // The extension's cross-context sync path: a write from another tab or the
  // background page lands in storage directly, not through this instance.
  describe('cross-context sync', () => {
    test('setup() notifies subscribers of a change made elsewhere', async () => {
      service.setup()
      const listener = vi.fn()
      service.subscribe(listener)

      await fakeBrowser.storage.local.set({ testKey: 'fromElsewhere' })

      expect(listener).toHaveBeenCalledWith('fromElsewhere')
    })

    test('ignores a change to an unrelated key', async () => {
      service.setup()
      const listener = vi.fn()
      service.subscribe(listener)

      await fakeBrowser.storage.local.set({ other: 'value' })

      expect(listener).not.toHaveBeenCalled()
    })

    test('destroy() stops reacting to changes made elsewhere', async () => {
      service.setup()
      const listener = vi.fn()
      service.subscribe(listener)
      service.destroy()

      await fakeBrowser.storage.local.set({ testKey: 'afterDestroy' })

      expect(listener).not.toHaveBeenCalled()
    })

    test('destroy() also drops local subscribers', async () => {
      const listener = vi.fn()
      service.subscribe(listener)
      service.destroy()

      await service.set('testValue')

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('storage failures', () => {
    test('read rejects when the storage API fails', async () => {
      await fakeBrowser.storage.local.set({ testKey: 'testValue' })
      vi.spyOn(fakeBrowser.storage.local, 'get').mockRejectedValue(
        new Error('IO error')
      )

      await expect(service.read()).rejects.toThrow('IO error')
    })

    test('set rejects and notifies no subscriber when the write fails', async () => {
      vi.spyOn(fakeBrowser.storage.local, 'set').mockRejectedValue(
        new Error('QUOTA_BYTES quota exceeded')
      )
      const listener = vi.fn()
      service.subscribe(listener)

      await expect(service.set('testValue')).rejects.toThrow(
        'QUOTA_BYTES quota exceeded'
      )
      expect(listener).not.toHaveBeenCalled()
    })

    test('delete rejects and notifies no subscriber when the removal fails', async () => {
      await fakeBrowser.storage.local.set({ testKey: 'testValue' })
      vi.spyOn(fakeBrowser.storage.local, 'remove').mockRejectedValue(
        new Error('IO error')
      )
      const listener = vi.fn()
      service.subscribe(listener)

      await expect(service.delete()).rejects.toThrow('IO error')
      expect(listener).not.toHaveBeenCalled()
    })

    test('clearStorage rejects and notifies no subscriber when the clear fails', async () => {
      vi.spyOn(fakeBrowser.storage.local, 'clear').mockRejectedValue(
        new Error('IO error')
      )
      const listener = vi.fn()
      service.subscribe(listener)

      await expect(service.clearStorage()).rejects.toThrow('IO error')
      expect(listener).not.toHaveBeenCalled()
    })
  })
})
