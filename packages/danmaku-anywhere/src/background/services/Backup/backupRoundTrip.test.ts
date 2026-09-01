import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import {
  createIntegrationInput,
  type IntegrationV1,
  migrateV1ToV2,
  migrateV2ToV3,
} from '@danmaku-anywhere/integration-policy'
import { fakeBrowser } from '@webext-core/fake-browser'
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
import { silentLogger } from '@/tests/silentLogger'
import { ConfigStateService } from './ConfigStateService'

/**
 * Restores real backups through the real option stores: one this build just
 * exported, and the v1.5.0 backup file the migration e2e ships. Guards against
 * validation that is stricter than what the extension itself writes, which
 * would reject users' own backups.
 */

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
    vi.spyOn(fakeBrowser.runtime, 'getManifest').mockReturnValue({
      manifest_version: 3,
      name: 'Test extension',
      version: '1.5.0',
    })

    const logger = silentLogger
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
      expect(result.details[store.name]).toEqual({
        success: true,
        droppedEntries: 0,
      })
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

  it('runs migrations on a version 0 payload instead of stamping it current', async () => {
    await extensionOptionsService.update({ enabled: false })

    await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        extensionOptions: { data: { legacyUnversioned: true }, version: 0 },
      },
    })

    const restored = await extensionOptionsService.get()

    expect(restored).toHaveProperty('legacyUnversioned', true)
    expect(restored.hotkeys).toBeDefined()
    expect(restored.theme).toBeDefined()
  })

  it('reports a store whose migration failed rather than silently resetting it', async () => {
    await extensionOptionsService.update({ enabled: false })

    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        extensionOptions: { data: null, version: 20 },
      },
    })

    expect(result.success).toBe(false)
    expect(result.details.extensionOptions?.success).toBe(false)
    expect(result.details.extensionOptions?.error).toContain('reset')
  })

  it('drops a v1 era integration the current schema rejects without losing the rest', async () => {
    const legacy = migrateV2ToV3(
      migrateV1ToV2([
        {
          name: 'legacy',
          id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
          policy: {
            title: { selector: [], regex: [] },
            episode: { selector: ['//e'], regex: [] },
            season: { selector: [], regex: [] },
            episodeTitle: { selector: [], regex: [] },
            titleOnly: false,
            dandanplay: { useMatchApi: false },
          },
        },
      ] as unknown as IntegrationV1[])
    )
    const usable = {
      ...legacy[0],
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3302',
      name: 'usable',
      policy: {
        ...legacy[0].policy,
        title: { selector: [{ value: '//h1', quick: false }], regex: [] },
      },
    }

    expect(legacy[0].policy.title.selector).toEqual([])

    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        integrationPolicy: {
          data: [legacy[0], usable],
          version: integrationPolicyService.options.latestVersion,
        },
      },
    })

    expect(result.details.integrationPolicy).toEqual({
      success: true,
      droppedEntries: 1,
    })
    expect(
      (await integrationPolicyService.getAll()).map((i) => i.name)
    ).toEqual(['usable'])
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
      extensionOptions: { success: true, droppedEntries: 0 },
      danmakuOptions: { success: true, droppedEntries: 0 },
      mountConfig: { success: true, droppedEntries: 0 },
      providerConfig: { success: true, droppedEntries: 0 },
      aiProviderConfig: { success: true, droppedEntries: 0 },
      integrationPolicy: { success: true, droppedEntries: 0 },
      localMatchingRule: { success: true, droppedEntries: 0 },
    })
    expect(result.success).toBe(true)
  })
})
