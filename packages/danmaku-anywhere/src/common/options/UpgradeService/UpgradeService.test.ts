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
vi.mock('@/common/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/common/utils/utils')>()
  return {
    ...actual,
    isServiceWorker: vi.fn(),
  }
})

// Mock ReadinessService
const { mockReadinessService } = vi.hoisted(() => {
  return {
    mockReadinessService: {
      waitUntilReady: vi.fn().mockResolvedValue(undefined),
      setReady: vi.fn(),
    },
  }
})

vi.mock('@/common/options/ReadinessService/ReadinessService', () => ({
  readinessService: mockReadinessService,
}))

import { isServiceWorker } from '@/common/utils/utils'

describe('UpgradeService', () => {
  let service: UpgradeService
  let mockStoreService: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    ;(isServiceWorker as any).mockReturnValue(false)
    mockChrome.runtime.getManifest.mockReturnValue({ version: '1.0.0' })
    mockChrome.storage.local.get.mockImplementation((key, cb) => cb({}))

    mockStoreService = {
      options: {
        key: 'testService',
        readInternal: vi.fn().mockResolvedValue({ data: { foo: 'bar' } }),
        upgrade: vi.fn().mockResolvedValue(undefined),
      },
    }
  })

  it('should wait for upgrade in background', async () => {
    ;(isServiceWorker as any).mockReturnValue(true)
    service = new UpgradeService([mockStoreService])

    await service.upgrade()

    expect(mockStoreService.options.upgrade).toHaveBeenCalled()
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      lastVersion: '1.0.0',
    })
    expect(mockReadinessService.setReady).toHaveBeenCalled()
  })

  it('should pass context to upgrade', async () => {
    ;(isServiceWorker as any).mockReturnValue(true)
    service = new UpgradeService([mockStoreService])

    await service.upgrade()

    expect(mockStoreService.options.upgrade).toHaveBeenCalledWith({
      testService: { foo: 'bar' },
    })
  })
})
