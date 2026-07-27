import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { BackupData } from '@/common/backup/dto'
import type { ILogger } from '@/common/Logger'
import { mockChrome } from '@/tests/mockChromeApis'
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

  const createMockOptionService = (name: string, latestVersion = 1) => ({
    name,
    options: {
      get: vi.fn(),
      getVersion: vi.fn(),
      set: vi.fn(),
      upgrade: vi.fn(),
      latestVersion,
    },
  })

  beforeEach(() => {
    mockDanmakuOptionsService = createMockOptionService('danmakuOptions', 1)
    mockExtensionOptionsService = createMockOptionService('extensionOptions', 2)
    mockMountConfigService = createMockOptionService('mountConfig', 3)
    mockProviderConfigService = createMockOptionService('providerConfig', 4)
    mockIntegrationPolicyService = createMockOptionService(
      'integrationPolicy',
      5
    )

    mockLogger = {
      sub: vi.fn().mockReturnThis(),
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    } as unknown as ILogger

    service = new ConfigStateService(
      [
        mockDanmakuOptionsService,
        mockExtensionOptionsService,
        mockMountConfigService,
        mockProviderConfigService,
        mockIntegrationPolicyService,
      ],
      mockLogger
    )

    mockChrome.runtime.getManifest.mockReturnValue({
      version: '1.0.0',
    })
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

    it.each([
      [
        'a non-object services map',
        { meta: { version: 1, timestamp: 1 }, services: [] },
      ],
      [
        'a store entry without a version',
        {
          meta: { version: 1, timestamp: 1 },
          services: { danmakuOptions: { data: { opt: 'danmaku' } } },
        },
      ],
      [
        'a store entry with a non-numeric version',
        {
          meta: { version: 1, timestamp: 1 },
          services: {
            danmakuOptions: { data: { opt: 'danmaku' }, version: 'one' },
          },
        },
      ],
    ])('should reject %s without touching any store', async (_label, input) => {
      await expect(service.restoreState(input)).rejects.toThrow(
        'Invalid backup format'
      )

      expect(mockDanmakuOptionsService.options.set).not.toHaveBeenCalled()
      expect(mockExtensionOptionsService.options.set).not.toHaveBeenCalled()
    })

    it.each([
      0, 2, 99,
    ])('should refuse envelope version %i without touching any store', async (version) => {
      await expect(
        service.restoreState({
          meta: { version, timestamp: 12345 },
          services: {
            danmakuOptions: { data: { opt: 'danmaku' }, version: 1 },
          },
        })
      ).rejects.toThrow(`Unsupported backup version ${version}`)

      expect(mockDanmakuOptionsService.options.set).not.toHaveBeenCalled()
      expect(mockDanmakuOptionsService.options.upgrade).not.toHaveBeenCalled()
    })

    it('should report a store whose payload fails its schema and still restore the rest', async () => {
      mockDanmakuOptionsService.backupSchema = z.object({
        opt: z.string(),
      })

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          danmakuOptions: { data: { opt: 42 }, version: 1 },
          extensionOptions: { data: { opt: 'ext' }, version: 2 },
        },
      })

      expect(result.success).toBe(false)
      expect(result.details.danmakuOptions?.success).toBe(false)
      expect(result.details.danmakuOptions?.error).toContain('opt')
      expect(mockDanmakuOptionsService.options.set).not.toHaveBeenCalled()

      expect(result.details.extensionOptions?.success).toBe(true)
      expect(mockExtensionOptionsService.options.set).toHaveBeenCalledWith(
        { opt: 'ext' },
        2
      )
    })

    it('should accept a payload that matches its schema', async () => {
      mockDanmakuOptionsService.backupSchema = z.object({
        opt: z.string(),
      })

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          danmakuOptions: { data: { opt: 'danmaku' }, version: 1 },
        },
      })

      expect(result.success).toBe(true)
      expect(mockDanmakuOptionsService.options.set).toHaveBeenCalledWith(
        { opt: 'danmaku' },
        1
      )
    })

    it('should refuse a store payload newer than the store schema it knows', async () => {
      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          danmakuOptions: { data: { opt: 'danmaku' }, version: 99 },
          extensionOptions: { data: { opt: 'ext' }, version: 2 },
        },
      })

      expect(result.success).toBe(false)
      expect(result.details.danmakuOptions?.error).toContain('newer')
      expect(mockDanmakuOptionsService.options.set).not.toHaveBeenCalled()
      expect(result.details.extensionOptions?.success).toBe(true)
    })

    it('should not schema-check payloads older than the store schema, leaving them to migrations', async () => {
      mockDanmakuOptionsService.backupSchema = z.object({
        renamedInLaterVersion: z.string(),
      })
      mockDanmakuOptionsService.options.latestVersion = 4

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          danmakuOptions: { data: { legacyField: 'old' }, version: 2 },
        },
      })

      expect(result.success).toBe(true)
      expect(mockDanmakuOptionsService.options.set).toHaveBeenCalledWith(
        { legacyField: 'old' },
        2
      )
      expect(mockDanmakuOptionsService.options.upgrade).toHaveBeenCalled()
    })

    it('should ignore backup entries that do not match a known store', async () => {
      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          removedStore: { data: { anything: true }, version: 7 },
          danmakuOptions: { data: { opt: 'danmaku' }, version: 1 },
        },
      })

      expect(result.success).toBe(true)
      expect(result.details.removedStore).toBeUndefined()
      expect(result.details.danmakuOptions?.success).toBe(true)
    })

    it('should skip services with shouldBackup=false', async () => {
      const mockUserAuthService = {
        ...createMockOptionService('userAuth'),
        shouldBackup: false,
      }

      service = new ConfigStateService(
        [
          mockDanmakuOptionsService,
          mockExtensionOptionsService,
          mockMountConfigService,
          mockProviderConfigService,
          mockIntegrationPolicyService,
          mockUserAuthService,
        ],
        mockLogger
      )

      const maliciousBackup: BackupData = {
        meta: { version: 1, timestamp: 12345 },
        services: {
          userAuth: {
            data: { token: 'attacker-token', user: { id: 'evil' } },
            version: 1,
          },
        },
      }

      await service.restoreState(maliciousBackup)

      expect(mockUserAuthService.options.set).not.toHaveBeenCalled()
      expect(mockUserAuthService.options.upgrade).not.toHaveBeenCalled()
    })
  })
})
