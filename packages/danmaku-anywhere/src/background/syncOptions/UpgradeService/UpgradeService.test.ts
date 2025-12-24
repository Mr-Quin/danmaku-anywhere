import { Container } from 'inversify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoggerSymbol } from '@/common/Logger'
import { StoreServiceSymbol } from '@/common/options/IStoreService'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { mockChrome } from '@/tests/mockChromeApis'
import { UpgradeService } from './UpgradeService'

describe('UpgradeService', () => {
  let container: Container
  let service: UpgradeService
  let mockStoreService: any
  let mockReadinessService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockChrome.runtime.getManifest.mockReturnValue({ version: '1.0.0' })
    mockChrome.storage.local.get.mockImplementation((key, cb) => cb({}))

    mockStoreService = {
      options: {
        key: 'testService',
        readUnblocked: vi.fn().mockResolvedValue({ foo: 'bar' }),
        upgrade: vi.fn().mockResolvedValue(undefined),
      },
    }

    mockReadinessService = {
      waitUntilReady: vi.fn().mockResolvedValue(undefined),
      setReady: vi.fn(),
      setVersion: vi.fn().mockResolvedValue(undefined),
    }

    container = new Container()
    container.bind(UpgradeService).toSelf()
    container.bind(StoreServiceSymbol).toConstantValue(mockStoreService)
    container.bind(ReadinessService).toConstantValue(mockReadinessService)
    container.bind(LoggerSymbol).toConstantValue({
      sub: () => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })

    service = container.get(UpgradeService)
  })

  it('should wait for upgrade in background', async () => {
    await service.upgrade()

    expect(mockStoreService.options.upgrade).toHaveBeenCalled()
    expect(mockReadinessService.setVersion).toHaveBeenCalledWith('1.0.0')
    expect(mockReadinessService.setReady).toHaveBeenCalled()
  })

  it('should pass context to upgrade', async () => {
    await service.upgrade()

    expect(mockStoreService.options.upgrade).toHaveBeenCalledWith({
      testService: { foo: 'bar' },
    })
  })

  it('should continue if one service upgrade fails', async () => {
    const mockStoreServiceSuccess = {
      options: {
        key: 'successService',
        readUnblocked: vi.fn().mockResolvedValue({ foo: 'bar' }),
        upgrade: vi.fn().mockResolvedValue(undefined),
      },
    }
    const mockStoreServiceFail = {
      options: {
        key: 'failService',
        readUnblocked: vi.fn().mockResolvedValue({ baz: 'qux' }),
        upgrade: vi.fn().mockRejectedValue(new Error('Upgrade failed')),
      },
    }

    // Rebind services for this test
    container.unbind(StoreServiceSymbol)
    container.bind(StoreServiceSymbol).toConstantValue(mockStoreServiceSuccess)
    container.bind(StoreServiceSymbol).toConstantValue(mockStoreServiceFail)

    // Rebind UpgradeService to clear singleton instance and injection
    container.unbind(UpgradeService)
    container.bind(UpgradeService).toSelf()

    // Re-resolve service to get new dependencies
    service = container.get(UpgradeService)

    await service.upgrade()

    expect(mockStoreServiceSuccess.options.upgrade).toHaveBeenCalled()
    expect(mockStoreServiceFail.options.upgrade).toHaveBeenCalled()
    expect(mockReadinessService.setReady).toHaveBeenCalled()
  })
})
