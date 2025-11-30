import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UpgradeService } from './UpgradeService'

// Mock chrome API
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    getManifest: vi.fn(),
  },
}
global.chrome = mockChrome as any

// Mock utils
vi.mock('@/common/utils/utils', () => ({
  isServiceWorker: vi.fn(),
}))

import { isServiceWorker } from '@/common/utils/utils'

describe('UpgradeService', () => {
  let service: UpgradeService
  let mockOptionsService: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    ;(isServiceWorker as any).mockReturnValue(false)
    mockChrome.runtime.getManifest.mockReturnValue({ version: '1.0.0' })
    mockChrome.storage.local.get.mockImplementation((key, cb) => cb({}))

    mockOptionsService = {
      key: 'testService',
      readInternal: vi.fn().mockResolvedValue({ data: { foo: 'bar' } }),
      upgrade: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('should wait for upgrade in background', async () => {
    ;(isServiceWorker as any).mockReturnValue(true)
    service = new UpgradeService()
    service.register(mockOptionsService)

    let isReady = false
    service.waitUntilReady().then(() => {
      isReady = true
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(isReady).toBe(false)

    await service.upgrade()

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(isReady).toBe(true)
    expect(mockOptionsService.upgrade).toHaveBeenCalled()
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      lastVersion: '1.0.0',
    })
  })

  it('should be ready immediately in UI if version matches', async () => {
    mockChrome.storage.local.get.mockImplementation((key, cb) =>
      cb({ lastVersion: '1.0.0' })
    )

    service = new UpgradeService()

    let isReady = false
    service.waitUntilReady().then(() => {
      isReady = true
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(isReady).toBe(true)
  })

  it('should wait for storage change in UI if version mismatch', async () => {
    mockChrome.storage.local.get.mockImplementation((key, cb) =>
      cb({ lastVersion: '0.9.0' })
    )
    let storageListener: any
    mockChrome.storage.onChanged.addListener.mockImplementation((cb) => {
      storageListener = cb
    })

    service = new UpgradeService()

    let isReady = false
    service.waitUntilReady().then(() => {
      isReady = true
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(isReady).toBe(false)

    // Simulate storage change
    storageListener({ lastVersion: { newValue: '1.0.0' } }, 'local')

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(isReady).toBe(true)
  })

  it('should pass context to upgrade', async () => {
    ;(isServiceWorker as any).mockReturnValue(true)
    service = new UpgradeService()
    service.register(mockOptionsService)

    await service.upgrade()

    expect(mockOptionsService.upgrade).toHaveBeenCalledWith({
      testService: { foo: 'bar' },
    })
  })
})
