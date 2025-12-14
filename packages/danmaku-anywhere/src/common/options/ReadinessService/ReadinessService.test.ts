import { Container } from 'inversify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockChrome } from '@/tests/mockChromeApis'
import { ReadinessService } from './ReadinessService'

const mockStorageInstance = {
  read: vi.fn(),
  set: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}

vi.mock('@/common/storage/ExtStorageService', () => {
  return {
    ExtStorageService: class {
      constructor() {
        return mockStorageInstance
      }
    },
  }
})

describe('ReadinessService', () => {
  let container: Container
  let service: ReadinessService

  beforeEach(() => {
    vi.clearAllMocks()
    mockChrome.runtime.getManifest.mockReturnValue({ version: '1.0.0' })
    container = new Container()
    container.bind(ReadinessService).toSelf()
  })

  it('should be ready immediately if version matches', async () => {
    mockStorageInstance.read.mockResolvedValue({ lastVersion: '1.0.0' })

    service = container.get(ReadinessService)

    await expect(service.waitUntilReady()).resolves.toBeUndefined()
    expect(mockStorageInstance.subscribe).not.toHaveBeenCalled()
  })

  it('should wait for upgrade if version mismatch', async () => {
    mockStorageInstance.read.mockResolvedValue({ lastVersion: '0.9.0' })

    service = container.get(ReadinessService)
    await new Promise((r) => setTimeout(r, 0))

    let isReady = false
    service.waitUntilReady().then(() => {
      isReady = true
    })

    // should be false before upgrade
    expect(isReady).toBe(false)
    expect(mockStorageInstance.subscribe).toHaveBeenCalled()

    // simulate upgrade success
    const listener = mockStorageInstance.subscribe.mock.calls[0][0]
    listener({ lastVersion: '1.0.0' })

    await service.waitUntilReady()
    expect(isReady).toBe(true)

    // listener should be cleaned up
    expect(mockStorageInstance.unsubscribe).toHaveBeenCalledWith(listener)
  })

  it('should ensure storage listener is cleaned up if read() fails', async () => {
    // simulate read failure
    mockStorageInstance.read.mockRejectedValue(new Error('Read failed'))

    service = container.get(ReadinessService)

    // no listener should be subscribed in case of error
    expect(mockStorageInstance.subscribe).not.toHaveBeenCalled()
  })
})
