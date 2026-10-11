import { Container } from 'inversify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoggerSymbol } from '@/common/Logger'
import { StoreServiceSymbol } from '@/common/options/IStoreService'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { silentLogger } from '@/tests/silentLogger'
import { UpgradeService } from './UpgradeService'

vi.mock('@/common/constants', () => {
  return {
    EXTENSION_VERSION: '1.0.0',
  }
})

/**
 * UpgradeService runs every store's upgrade with the stored data of all stores
 * as context. The version marker is written and readiness signalled only when
 * every store persisted; otherwise the call rejects naming the failed stores
 * and a later call starts over.
 */

// lint-specs-allow-call-only: upgrade() returns void; the collaborator calls it makes, and with what merged context, are the only observable behavior

describe('UpgradeService', () => {
  let container: Container
  let service: UpgradeService
  let mockStoreService: any
  let mockReadinessService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockStoreService = {
      options: {
        key: 'testService',
        readStoredUnblocked: vi
          .fn()
          .mockResolvedValue({ data: { foo: 'bar' }, version: 1 }),
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
    container.bind(LoggerSymbol).toConstantValue(silentLogger)

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

  it('leaves an absent store out of the context', async () => {
    mockStoreService.options.readStoredUnblocked.mockResolvedValue(undefined)

    await service.upgrade()

    expect(mockStoreService.options.upgrade).toHaveBeenCalledWith({})
  })

  it('rejects without reading further when a store cannot be read', async () => {
    mockStoreService.options.readStoredUnblocked.mockRejectedValue(
      new Error('IO error')
    )

    await expect(service.upgrade()).rejects.toThrow('IO error')

    expect(mockStoreService.options.upgrade).not.toHaveBeenCalled()
    expect(mockReadinessService.setVersion).not.toHaveBeenCalled()
    expect(mockReadinessService.setReady).not.toHaveBeenCalled()
  })

  describe('when one store fails to persist', () => {
    let mockStoreServiceSuccess: any
    let mockStoreServiceFail: any

    beforeEach(() => {
      mockStoreServiceSuccess = {
        options: {
          key: 'successService',
          readStoredUnblocked: vi
            .fn()
            .mockResolvedValue({ data: { foo: 'bar' }, version: 1 }),
          upgrade: vi.fn().mockResolvedValue(undefined),
        },
      }
      mockStoreServiceFail = {
        options: {
          key: 'failService',
          readStoredUnblocked: vi
            .fn()
            .mockResolvedValue({ data: { baz: 'qux' }, version: 1 }),
          upgrade: vi
            .fn()
            .mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'))
            .mockResolvedValue(undefined),
        },
      }

      container.unbind(StoreServiceSymbol)
      container.bind(StoreServiceSymbol).toConstantValue(mockStoreServiceFail)
      container
        .bind(StoreServiceSymbol)
        .toConstantValue(mockStoreServiceSuccess)
      container.unbind(UpgradeService)
      container.bind(UpgradeService).toSelf()
      service = container.get(UpgradeService)
    })

    it('still upgrades the other stores', async () => {
      await service.upgrade().catch(() => {})

      expect(mockStoreServiceSuccess.options.upgrade).toHaveBeenCalled()
    })

    it('rejects naming the failed store without recording the version', async () => {
      await expect(service.upgrade()).rejects.toThrow(/failService/)

      expect(mockReadinessService.setVersion).not.toHaveBeenCalled()
      expect(mockReadinessService.setReady).not.toHaveBeenCalled()
    })

    it('runs every store again on the next call', async () => {
      await service.upgrade().catch(() => {})

      await service.upgrade()

      expect(mockStoreServiceFail.options.upgrade).toHaveBeenCalledTimes(2)
      expect(mockStoreServiceSuccess.options.upgrade).toHaveBeenCalledTimes(2)
      expect(mockReadinessService.setVersion).toHaveBeenCalledWith('1.0.0')
      expect(mockReadinessService.setReady).toHaveBeenCalledTimes(1)
    })
  })

  it('does not signal readiness when the version write fails', async () => {
    mockReadinessService.setVersion.mockRejectedValue(new Error('IO error'))

    await expect(service.upgrade()).rejects.toThrow('IO error')

    expect(mockReadinessService.setReady).not.toHaveBeenCalled()
  })
})
