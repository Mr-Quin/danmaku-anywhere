import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BackupData } from '@/common/backup/dto'
import type { ILogger } from '@/common/Logger'
import { ConfigStateService } from './ConfigStateService'

// Manual mocks without relying on IOC
vi.mock('@/common/options/danmakuOptions/service', () => ({
  DanmakuOptionsService: class {},
}))
vi.mock('@/common/options/extensionOptions/service', () => ({
  ExtensionOptionsService: class {},
}))
vi.mock('@/common/options/mountConfig/service', () => ({
  MountConfigService: class {},
}))
vi.mock('@/common/options/providerConfig/service', () => ({
  ProviderConfigService: class {},
}))
vi.mock('@/common/options/integrationPolicyStore/service', () => ({
  IntegrationPolicyService: class {},
}))

describe('ConfigStateService', () => {
  let service: ConfigStateService
  let mockDanmakuOptionsService: any
  let mockExtensionOptionsService: any
  let mockMountConfigService: any
  let mockProviderConfigService: any
  let mockIntegrationPolicyService: any
  let mockLogger: any

  const createMockOptionService = () => ({
    options: {
      get: vi.fn(),
      getVersion: vi.fn(),
      set: vi.fn(),
      upgrade: vi.fn(),
    },
  })

  beforeEach(() => {
    mockDanmakuOptionsService = createMockOptionService()
    mockExtensionOptionsService = createMockOptionService()
    mockMountConfigService = createMockOptionService()
    mockProviderConfigService = createMockOptionService()
    mockIntegrationPolicyService = createMockOptionService()

    mockLogger = {
      sub: vi.fn().mockReturnThis(),
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    } as unknown as ILogger

    service = new ConfigStateService(
      mockDanmakuOptionsService,
      mockExtensionOptionsService,
      mockMountConfigService,
      mockProviderConfigService,
      mockIntegrationPolicyService,
      mockLogger
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getState', () => {
    it('should collect data and versions from all services', async () => {
      mockDanmakuOptionsService.options.get.mockResolvedValue({
        opt: 'danmaku',
      })
      mockDanmakuOptionsService.options.getVersion.mockResolvedValue(1)
      mockExtensionOptionsService.options.get.mockResolvedValue({ opt: 'ext' })
      mockExtensionOptionsService.options.getVersion.mockResolvedValue(2)
      mockMountConfigService.options.get.mockResolvedValue([{ id: 1 }])
      mockMountConfigService.options.getVersion.mockResolvedValue(3)
      mockProviderConfigService.options.get.mockResolvedValue([{ id: 2 }])
      mockProviderConfigService.options.getVersion.mockResolvedValue(4)
      mockIntegrationPolicyService.options.get.mockResolvedValue([{ id: 3 }])
      mockIntegrationPolicyService.options.getVersion.mockResolvedValue(5)

      const result = await service.getState()

      expect(result.meta.version).toBe(1)
      expect(result.meta.timestamp).toBeDefined()
      expect(result.services.danmakuOptions).toEqual({
        data: { opt: 'danmaku' },
        version: 1,
      })
      expect(result.services.extensionOptions).toEqual({
        data: { opt: 'ext' },
        version: 2,
      })
      expect(result.services.mountConfig).toEqual({
        data: [{ id: 1 }],
        version: 3,
      })
      expect(result.services.providerConfig).toEqual({
        data: [{ id: 2 }],
        version: 4,
      })
      expect(result.services.integrationPolicy).toEqual({
        data: [{ id: 3 }],
        version: 5,
      })
    })
  })

  describe('restoreState', () => {
    const validBackup: BackupData = {
      meta: { version: 1, timestamp: 12345 },
      services: {
        danmakuOptions: { data: { opt: 'danmaku' }, version: 1 },
        extensionOptions: { data: { opt: 'ext' }, version: 2 },
      },
    }

    it('should restore services that are present in backup', async () => {
      await service.restoreState(validBackup)

      expect(mockDanmakuOptionsService.options.set).toHaveBeenCalledWith(
        { opt: 'danmaku' },
        1
      )
      expect(mockDanmakuOptionsService.options.upgrade).toHaveBeenCalled()

      expect(mockExtensionOptionsService.options.set).toHaveBeenCalledWith(
        { opt: 'ext' },
        2
      )
      expect(mockExtensionOptionsService.options.upgrade).toHaveBeenCalled()

      // Others not in backup should not be called
      expect(mockMountConfigService.options.set).not.toHaveBeenCalled()
    })

    it('should handle failures gracefully (fail-safe)', async () => {
      // simulate danmaku options failing
      mockDanmakuOptionsService.options.set.mockRejectedValue(
        new Error('Validation failed')
      )

      const result = await service.restoreState(validBackup)

      expect(result.success).toBe(false)
      expect(result.details.danmakuOptions?.success).toBe(false)
      expect(result.details.danmakuOptions?.error).toContain(
        'Validation failed'
      )

      // Extension options should still succeed
      expect(result.details.extensionOptions?.success).toBe(true)
      expect(mockExtensionOptionsService.options.set).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should throw error for invalid backup format', async () => {
      await expect(service.restoreState({} as any)).rejects.toThrow(
        'Invalid backup format'
      )
      await expect(service.restoreState({ meta: {} } as any)).rejects.toThrow(
        'Invalid backup format'
      )
    })
  })
})
