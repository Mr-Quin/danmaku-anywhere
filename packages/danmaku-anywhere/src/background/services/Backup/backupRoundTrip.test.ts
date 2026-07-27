import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createIntegrationInput } from '@danmaku-anywhere/integration-policy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { AiProviderConfigService } from '@/common/options/aiProviderConfig/service'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { IStoreService } from '@/common/options/IStoreService'
import { zIntegration } from '@/common/options/integrationPolicyStore/schema'
import { IntegrationPolicyService } from '@/common/options/integrationPolicyStore/service'
import { NamingRuleService } from '@/common/options/localMatchingRule/service'
import { MountConfigService } from '@/common/options/mountConfig/service'
import type { IOptionsServiceFactory } from '@/common/options/OptionsService/OptionServiceFactory'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import type { OptionsSchema } from '@/common/options/OptionsService/types'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { mockChrome } from '@/tests/mockChromeApis'
import { ConfigStateService } from './ConfigStateService'

/**
 * Restores real backups through the real option stores: one this build just
 * exported, and the v1.5.0 backup file the migration e2e ships. Guards against
 * validation that is stricter than what the extension itself writes, which
 * would reject users' own backups.
 */

function installInMemoryStorage() {
  const areas = ['local', 'sync', 'session'] as const

  areas.forEach((area) => {
    const store = new Map<string, unknown>()
    const mock = mockChrome.storage[area]

    mock.get.mockImplementation(async (key: string | string[] | null) => {
      if (key === null) {
        return Object.fromEntries(store)
      }
      const keys = Array.isArray(key) ? key : [key]
      const result: Record<string, unknown> = {}
      keys.forEach((k) => {
        if (store.has(k)) {
          result[k] = store.get(k)
        }
      })
      return result
    })
    mock.set.mockImplementation(async (items: Record<string, unknown>) => {
      Object.entries(items).forEach(([k, v]) => store.set(k, v))
    })
    mock.remove.mockImplementation(async (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key]
      keys.forEach((k) => store.delete(k))
    })
    mock.clear.mockImplementation(async () => {
      store.clear()
    })
  })
}

function createSilentLogger(): ILogger {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    sub: vi.fn(() => logger),
  }
  return logger as unknown as ILogger
}

describe('backup round trip', () => {
  let configStateService: ConfigStateService
  let stores: IStoreService[]
  let mountConfigService: MountConfigService
  let providerConfigService: ProviderConfigService
  let aiProviderConfigService: AiProviderConfigService
  let integrationPolicyService: IntegrationPolicyService
  let namingRuleService: NamingRuleService
  let extensionOptionsService: ExtensionOptionsService
  let danmakuOptionsService: DanmakuOptionsService

  beforeEach(async () => {
    vi.clearAllMocks()
    installInMemoryStorage()
    mockChrome.runtime.getManifest.mockReturnValue({ version: '1.5.0' })

    const logger = createSilentLogger()
    const readinessService = new ReadinessService(logger)
    readinessService.setReady()

    const factory: IOptionsServiceFactory = <T extends OptionsSchema>(
      key: string,
      defaultOptions: T,
      optionsLogger: ILogger,
      storageType?: 'local' | 'sync' | 'session'
    ) => {
      return new OptionsService<T>(
        readinessService,
        key,
        defaultOptions,
        optionsLogger,
        storageType
      )
    }

    providerConfigService = new ProviderConfigService(logger, factory)
    extensionOptionsService = new ExtensionOptionsService(
      logger,
      providerConfigService,
      factory
    )
    danmakuOptionsService = new DanmakuOptionsService(logger, factory)
    mountConfigService = new MountConfigService(logger, factory)
    aiProviderConfigService = new AiProviderConfigService(logger, factory)
    integrationPolicyService = new IntegrationPolicyService(logger, factory)
    namingRuleService = new NamingRuleService(logger, factory)

    stores = [
      extensionOptionsService,
      danmakuOptionsService,
      mountConfigService,
      providerConfigService,
      aiProviderConfigService,
      integrationPolicyService,
      namingRuleService,
    ]

    await Promise.all(stores.map((store) => store.options.upgrade()))

    configStateService = new ConfigStateService(stores, logger)
  })

  async function seedStores() {
    await mountConfigService.create({
      name: 'test config',
      patterns: ['https://example.com/*'],
      mediaQuery: 'video',
      enabled: true,
      mode: 'manual',
    })
    await providerConfigService.create({
      id: 'provider-1',
      manifestId: 'dandanplay',
      name: 'DanDanPlay',
      enabled: true,
      configValues: { apiBaseUrl: 'https://api.example.com' },
    })
    await aiProviderConfigService.create({
      id: 'ai-1',
      name: 'Custom AI',
      enabled: true,
      provider: 'openai-compatible',
      settings: {
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test',
        model: 'test-model',
        // Stored as parsed JSON while the schema expects the raw string, which
        // is why this store cannot reuse its own schema to validate a restore.
        providerOptions: { reasoning: '{"effort":"low"}' },
      },
    })
    const integrationInput = createIntegrationInput('test integration')
    integrationInput.policy.title.selector = [{ value: '//h1', quick: false }]
    await integrationPolicyService.import(zIntegration.parse(integrationInput))
    await namingRuleService.addRule({
      folderPath: '/media/show',
      title: 'Show',
      pattern: 'S01E{episode:02d}',
    })
    await extensionOptionsService.update({ enabled: false })
    await danmakuOptionsService.update({ speed: 2 })
  }

  it('restores a backup exported by the current version with every store reporting success', async () => {
    await seedStores()

    const backup = await configStateService.getState()
    const result = await configStateService.restoreState(backup)

    expect(result.success).toBe(true)
    stores.forEach((store) => {
      expect(result.details[store.name]).toEqual({ success: true })
    })
  })

  it('survives a JSON round trip, the shape an exported file actually takes', async () => {
    await seedStores()

    const backup = await configStateService.getState()
    const roundTripped = JSON.parse(JSON.stringify(backup))
    const result = await configStateService.restoreState(roundTripped)

    expect(result.success).toBe(true)
  })

  it('restores default state with no user data seeded', async () => {
    const backup = await configStateService.getState()
    const result = await configStateService.restoreState(backup)

    expect(result.success).toBe(true)
  })

  it('exports every store that opts into backup', async () => {
    const backup = await configStateService.getState()

    expect(Object.keys(backup.services).sort()).toEqual(
      stores.map((store) => store.name).sort()
    )
  })

  it('restores the v1.5.0 backup file shipped as an e2e fixture', async () => {
    const legacyBackup = JSON.parse(
      gunzipSync(
        readFileSync(
          resolve(
            __dirname,
            '../../../../e2e/fixtures/migration/backup.json.gz'
          )
        )
      ).toString('utf-8')
    )

    const result = await configStateService.restoreState(legacyBackup)

    expect(result.details).toEqual({
      extensionOptions: { success: true },
      danmakuOptions: { success: true },
      mountConfig: { success: true },
      providerConfig: { success: true },
      aiProviderConfig: { success: true },
      integrationPolicy: { success: true },
      localMatchingRule: { success: true },
    })
    expect(result.success).toBe(true)
  })
})
