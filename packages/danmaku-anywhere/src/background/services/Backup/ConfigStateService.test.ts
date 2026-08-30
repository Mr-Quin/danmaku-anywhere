import { fakeBrowser } from '@webext-core/fake-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { BackupData } from '@/common/backup/dto'
import { silentLogger } from '@/tests/silentLogger'
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
      upgrade: vi.fn().mockResolvedValue('upgraded'),
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
      ...silentLogger,
      error: vi.fn(),
      sub: () => mockLogger,
    }

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

    vi.spyOn(fakeBrowser.runtime, 'getManifest').mockReturnValue({
      manifest_version: 3,
      name: 'Test extension',
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

    it('should keep the good entries of a list payload and report the dropped ones', async () => {
      mockMountConfigService.backupItemSchema = z.object({
        name: z.string(),
      })

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          mountConfig: {
            data: [{ name: 'good' }, { name: 42 }, { name: 'also good' }],
            version: 3,
          },
        },
      })

      expect(mockMountConfigService.options.set).toHaveBeenCalledWith(
        [{ name: 'good' }, { name: 'also good' }],
        3
      )
      expect(result.details.mountConfig).toEqual({
        success: true,
        droppedEntries: 1,
      })
      expect(result.success).toBe(false)
    })

    it('should refuse a list payload where nothing survives rather than writing an empty store', async () => {
      mockMountConfigService.backupItemSchema = z.object({
        name: z.string(),
      })

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          mountConfig: { data: [{ name: 1 }, { name: 2 }], version: 3 },
        },
      })

      expect(mockMountConfigService.options.set).not.toHaveBeenCalled()
      expect(result.details.mountConfig?.success).toBe(false)
      expect(result.details.mountConfig?.error).toContain('All 2 entries')
      expect(result.success).toBe(false)
    })

    it('should refuse a list payload that is not a list', async () => {
      mockMountConfigService.backupItemSchema = z.object({
        name: z.string(),
      })

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          mountConfig: { data: { name: 'not in a list' }, version: 3 },
        },
      })

      expect(mockMountConfigService.options.set).not.toHaveBeenCalled()
      expect(result.details.mountConfig?.error).toContain('list')
    })

    it('should accept an empty list payload', async () => {
      mockMountConfigService.backupItemSchema = z.object({
        name: z.string(),
      })

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          mountConfig: { data: [], version: 3 },
        },
      })

      expect(result.success).toBe(true)
      expect(mockMountConfigService.options.set).toHaveBeenCalledWith([], 3)
    })

    it('should report a store whose migration failed and reset it to defaults', async () => {
      mockDanmakuOptionsService.options.upgrade.mockResolvedValue('reset')

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          danmakuOptions: { data: { opt: 'danmaku' }, version: 1 },
          extensionOptions: { data: { opt: 'ext' }, version: 2 },
        },
      })

      expect(result.success).toBe(false)
      expect(result.details.danmakuOptions?.success).toBe(false)
      expect(result.details.danmakuOptions?.error).toContain('reset')
      expect(result.details.extensionOptions?.success).toBe(true)
    })

    it('should pass a version 0 payload through as version 0 so migrations run', async () => {
      await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          danmakuOptions: { data: { legacyUnversioned: true }, version: 0 },
        },
      })

      expect(mockDanmakuOptionsService.options.set).toHaveBeenCalledWith(
        { legacyUnversioned: true },
        0
      )
      expect(mockDanmakuOptionsService.options.upgrade).toHaveBeenCalled()
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
