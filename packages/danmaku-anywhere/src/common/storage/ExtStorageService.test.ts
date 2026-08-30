import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ExtStorageService } from './ExtStorageService'

describe('ExtStorageService', () => {
  let service: ExtStorageService<any>

  beforeEach(() => {
    service = new ExtStorageService('testKey', { storageType: 'local' })
  })

  test('read method should get data from storage', async () => {
    await fakeBrowser.storage.local.set({ testKey: 'testValue' })
    const result = await service.read()
    expect(result).toBe('testValue')
  })

  test('set method should set data in storage', async () => {
    await service.set('testValue')
    expect(await fakeBrowser.storage.local.get('testKey')).toEqual({
      testKey: 'testValue',
    })
  })

  test('delete method should remove data from storage', async () => {
    await fakeBrowser.storage.local.set({ testKey: 'testValue', other: 'keep' })
    await service.delete()
    expect(await fakeBrowser.storage.local.get(null)).toEqual({ other: 'keep' })
  })

  test('clearStorage method should clear all data from storage', async () => {
    await fakeBrowser.storage.local.set({ testKey: 'testValue', other: 'gone' })
    await service.clearStorage()
    expect(await fakeBrowser.storage.local.get(null)).toEqual({})
  })

  test('listeners should be added by subscribe and removed by unsubscribe', async () => {
    const listener = vi.fn()
    service.subscribe(listener)
    await service.set('testValue')
    expect(listener).toHaveBeenCalledWith('testValue')
    service.unsubscribe(listener)
    await service.set('testValue2')
    expect(listener).not.toHaveBeenCalledWith('testValue2')
  })
})
