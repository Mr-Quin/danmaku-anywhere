import { Container } from 'inversify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
        readUnblocked: vi.fn().mockResolvedValue({ data: { foo: 'bar' } }),
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
})
