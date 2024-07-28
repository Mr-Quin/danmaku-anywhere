import { describe, beforeEach, test, vi, expect } from 'vitest'

import { ExtStorageService } from './ExtStorageService'

import { mockStorage } from '@/tests/mockChromeApis'

describe('ExtStorageService', () => {
  let service: ExtStorageService<any>

  beforeEach(() => {
    service = new ExtStorageService('testKey', { storageType: 'local' })
    vi.clearAllMocks()
  })

  test('read method should get data from storage', async () => {
    mockStorage.get.mockResolvedValue({ testKey: 'testValue' })
    const result = await service.read()
    expect(result).toBe('testValue')
  })

  test('set method should set data in storage', async () => {
    await service.set('testValue')
    expect(mockStorage.set).toHaveBeenCalledWith({ testKey: 'testValue' })
  })

  test('delete method should remove data from storage', async () => {
    await service.delete()
    expect(mockStorage.remove).toHaveBeenCalledWith('testKey')
  })

  test('clearStorage method should clear all data from storage', async () => {
    await service.clearStorage()
    expect(mockStorage.clear).toHaveBeenCalled()
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
