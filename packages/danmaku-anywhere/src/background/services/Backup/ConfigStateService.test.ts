import { fakeBrowser } from '@webext-core/fake-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { BackupData } from '@/common/backup/dto'
import { EXTENSION_VERSION } from '@/common/constants'
import type { IStoreService } from '@/common/options/IStoreService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { silentLogger } from '@/tests/silentLogger'
import { ConfigStateService } from './ConfigStateService'

/**
 * ConfigStateService exports every backed-up store and restores a backup store
 * by store: each payload is migrated and validated before anything is written,
 * and the result reports each store's outcome. Over real storage, a store
 * whose write fails is reported with the storage error while the others report
 * their own outcome, and an export fails on a read error instead of exporting
 * defaults.
 */

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
      key: name,
      get: vi.fn(),
      getVersion: vi.fn(),
      set: vi.fn(),
      upgrade: vi.fn(),
      migrate: vi.fn((data: unknown) => data),
      readUnblocked: vi.fn(),
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
      expect(mockExtensionOptionsService.options.set).toHaveBeenCalledWith(
        { opt: 'ext' },
        2
      )

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
      await expect(service.restoreState({} as any)).rejects.toMatchObject({
        problem: 'invalidFormat',
      })
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

    for (const version of [0, 2, 99]) {
      it(`should refuse envelope version ${version} without touching any store`, async () => {
        await expect(
          service.restoreState({
            meta: { version, timestamp: 12345 },
            services: {
              danmakuOptions: { data: { opt: 'danmaku' }, version: 1 },
            },
          })
        ).rejects.toThrow(`Unsupported backup version ${version}`)
        await expect(
          service.restoreState({
            meta: { version, timestamp: 12345 },
            services: {},
          })
        ).rejects.toMatchObject({ problem: 'unsupportedVersion' })

        expect(mockDanmakuOptionsService.options.set).not.toHaveBeenCalled()
        expect(mockDanmakuOptionsService.options.migrate).not.toHaveBeenCalled()
      })
    }

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
      expect(result.details.mountConfig).toMatchObject({
        success: true,
        droppedEntries: 1,
        dropped: [{ reason: expect.any(String) }],
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

    it('should report a store whose migration throws and leave it untouched', async () => {
      mockDanmakuOptionsService.options.migrate.mockImplementation(() => {
        throw new Error('bad step')
      })

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          danmakuOptions: { data: { opt: 'danmaku' }, version: 1 },
          extensionOptions: { data: { opt: 'ext' }, version: 2 },
        },
      })

      expect(result.success).toBe(false)
      expect(result.details.danmakuOptions?.success).toBe(false)
      expect(result.details.danmakuOptions?.error).toContain('bad step')
      expect(mockDanmakuOptionsService.options.set).not.toHaveBeenCalled()
      expect(result.details.extensionOptions?.success).toBe(true)
    })

    it('should migrate a version 0 payload from version 0 and write it at the latest version', async () => {
      mockDanmakuOptionsService.options.migrate.mockReturnValue({
        migrated: true,
      })

      await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          danmakuOptions: { data: { legacyUnversioned: true }, version: 0 },
        },
      })

      expect(mockDanmakuOptionsService.options.migrate).toHaveBeenCalledWith(
        { legacyUnversioned: true },
        0,
        expect.anything()
      )
      expect(mockDanmakuOptionsService.options.set).toHaveBeenCalledWith(
        { migrated: true },
        1
      )
    })

    it('should give migrations the restored payloads as context, and stored data for stores not in the backup', async () => {
      mockMountConfigService.options.readUnblocked = vi
        .fn()
        .mockResolvedValue([{ stored: true }])

      await service.restoreState(validBackup)

      expect(mockExtensionOptionsService.options.migrate).toHaveBeenCalledWith(
        { opt: 'ext' },
        2,
        expect.objectContaining({
          stores: expect.objectContaining({
            danmakuOptions: { opt: 'danmaku' },
            extensionOptions: { opt: 'ext' },
            mountConfig: [{ stored: true }],
          }),
        })
      )
    })

    it('should count entries lost in migration as dropped', async () => {
      mockMountConfigService.backupItemSchema = z.object({
        name: z.string(),
      })
      mockMountConfigService.options.migrate.mockReturnValue([{ name: 'a' }])

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          mountConfig: {
            data: [{ name: 'a' }, { name: 'b' }],
            version: 1,
          },
        },
      })

      expect(result.details.mountConfig).toMatchObject({
        success: true,
        droppedEntries: 1,
      })
      expect(result.success).toBe(false)
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

    it('should schema-check an older payload after migrating it', async () => {
      mockDanmakuOptionsService.backupSchema = z.object({
        renamedInLaterVersion: z.string(),
      })
      mockDanmakuOptionsService.options.latestVersion = 4
      mockDanmakuOptionsService.options.migrate.mockReturnValue({
        renamedInLaterVersion: 'old',
      })

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          danmakuOptions: { data: { legacyField: 'old' }, version: 2 },
        },
      })

      expect(result.success).toBe(true)
      expect(mockDanmakuOptionsService.options.set).toHaveBeenCalledWith(
        { renamedInLaterVersion: 'old' },
        4
      )
    })

    it('should refuse an older payload that fails the schema once migrated', async () => {
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

      expect(result.details.danmakuOptions?.success).toBe(false)
      expect(mockDanmakuOptionsService.options.set).not.toHaveBeenCalled()
    })

    it('should refuse a list payload whose entries are all lost in migration', async () => {
      mockMountConfigService.backupItemSchema = z.object({
        name: z.string(),
      })
      mockMountConfigService.options.migrate.mockReturnValue([])

      const result = await service.restoreState({
        meta: { version: 1, timestamp: 12345 },
        services: {
          mountConfig: { data: [{ name: 'old shape' }], version: 1 },
        },
      })

      expect(result.details.mountConfig?.success).toBe(false)
      expect(mockMountConfigService.options.set).not.toHaveBeenCalled()
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
      expect(mockUserAuthService.options.migrate).not.toHaveBeenCalled()
    })
  })
})

describe('ConfigStateService over chrome.storage', () => {
  async function createStore(readiness: ReadinessService, name: string) {
    await fakeBrowser.storage.sync.set({
      [name]: { data: { value: 'stored' }, version: 1 },
    })
    const options = new OptionsService<{ value: string }>(
      readiness,
      name,
      { value: 'default' },
      silentLogger
    ).version(1, { upgrade: (data) => data })
    return { name, options } satisfies IStoreService
  }

  async function readStored(name: string) {
    const stored = await fakeBrowser.storage.sync.get(name)
    return stored[name]
  }

  async function setup() {
    await fakeBrowser.storage.local.set({
      lastVersion: { lastVersion: EXTENSION_VERSION },
    })
    const readiness = new ReadinessService(silentLogger)
    const stores = [
      await createStore(readiness, 'alpha'),
      await createStore(readiness, 'beta'),
    ]
    return new ConfigStateService(stores, silentLogger)
  }

  const backup: BackupData = {
    meta: { version: 1, timestamp: 12345 },
    services: {
      alpha: { data: { value: 'restored' }, version: 1 },
      beta: { data: { value: 'restored' }, version: 1 },
    },
  }

  it('reports a store whose write fails with the storage error and restores the rest', async () => {
    const service = await setup()
    const set = fakeBrowser.storage.sync.set.bind(fakeBrowser.storage.sync)
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockImplementation(
      async (items) => {
        if ('alpha' in items) {
          throw new Error('QUOTA_BYTES_PER_ITEM quota exceeded')
        }
        return set(items)
      }
    )

    const result = await service.restoreState(backup)

    expect(result.success).toBe(false)
    expect(result.details.alpha).toEqual({
      success: false,
      error: 'QUOTA_BYTES_PER_ITEM quota exceeded',
    })
    expect(result.details.beta).toEqual({ success: true, droppedEntries: 0 })
    expect(await readStored('alpha')).toEqual({
      data: { value: 'stored' },
      version: 1,
    })
    expect(await readStored('beta')).toEqual({
      data: { value: 'restored' },
      version: 1,
    })
  })

  it('getState rejects when a store cannot be read', async () => {
    const service = await setup()
    vi.spyOn(fakeBrowser.storage.sync, 'get').mockRejectedValue(
      new Error('IO error')
    )

    await expect(service.getState()).rejects.toThrow('IO error')
  })
})
