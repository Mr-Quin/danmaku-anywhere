import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockChrome } from '@/tests/mockChromeApis'
import { ExtStorageService } from './ExtStorageService'

describe('ExtStorageService', () => {
  let service: ExtStorageService<any>

  beforeEach(() => {
    service = new ExtStorageService('testKey', { storageType: 'local' })
    vi.clearAllMocks()
  })

  test('read method should get data from storage', async () => {
    mockChrome.storage.local.get.mockResolvedValue({ testKey: 'testValue' })
    const result = await service.read()
    expect(result).toBe('testValue')
  })

  test('set method should set data in storage', async () => {
    await service.set('testValue')
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      testKey: 'testValue',
    })
  })

  test('delete method should remove data from storage', async () => {
    await service.delete()
    expect(mockChrome.storage.local.remove).toHaveBeenCalledWith('testKey')
  })

  test('clearStorage method should clear all data from storage', async () => {
    await service.clearStorage()
    expect(mockChrome.storage.local.clear).toHaveBeenCalled()
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
