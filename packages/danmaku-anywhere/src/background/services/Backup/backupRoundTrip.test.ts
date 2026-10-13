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
import { backupDataSchema } from '@/common/backup/schema'
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
import { ProviderConfigWriter } from '@/common/options/providerConfig/ProviderConfigWriter'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { silentLogger } from '@/tests/silentLogger'
import { ConfigStateService } from './ConfigStateService'

/**
 * Restores real backups through the real option stores: one this build just
 * exported, the v1.5.0 backup file the migration e2e ships, and old payloads
 * that fail to migrate. Guards against validation stricter than what the
 * extension writes, and checks a failed store keeps its pre-restore data.
 */

describe('backup round trip', () => {
  let configStateService: ConfigStateService
  let stores: IStoreService[]
  let mountConfigService: MountConfigService
  let providerConfigService: ProviderConfigService
  let providerConfigWriter: ProviderConfigWriter
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

    const container = createUpgradeContainer()
    providerConfigService = container.get(ProviderConfigService)
    providerConfigWriter = container.get(ProviderConfigWriter)
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

    configStateService = new ConfigStateService(stores, logger, [
      providerConfigWriter,
    ])
  })

  function readLegacyBackup(): unknown {
    return JSON.parse(
      gunzipSync(
        readFileSync(
          resolve(
            __dirname,
            '../../../../e2e/fixtures/migration/backup.json.gz'
          )
        )
      ).toString('utf-8')
    )
  }

  async function seedStores() {
    await mountConfigService.create({
      name: 'test config',
      patterns: ['https://example.com/*'],
      mediaQuery: 'video',
      enabled: true,
      mode: 'manual',
    })
    await providerConfigWriter.create({
      manifestId: 'dandanplay',
      customName: 'DanDanPlay',
      enabled: true,
      configValues: { baseUrl: 'https://api.example.com' },
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
        providerOptions: {
          reasoning: '{"effort":"low"}',
          budget: '5',
          tag: 'null',
        },
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

  it('keeps an unset info panel choice unset through export and restore', async () => {
    const backup = await configStateService.getState()
    const result = await configStateService.restoreState(
      JSON.parse(JSON.stringify(backup))
    )

    expect(result.success).toBe(true)
    const restored = await extensionOptionsService.get()
    expect(restored.infoPanel).not.toHaveProperty('enabled')
  })

  it('keeps an explicit info panel choice through export and restore', async () => {
    await extensionOptionsService.update({ infoPanel: { enabled: false } })

    const backup = await configStateService.getState()
    await extensionOptionsService.update({ infoPanel: {} })
    await configStateService.restoreState(JSON.parse(JSON.stringify(backup)))

    expect((await extensionOptionsService.get()).infoPanel).toEqual({
      enabled: false,
    })
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
    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        extensionOptions: { data: { enabled: false }, version: 0 },
      },
    })

    const restored = await extensionOptionsService.get()

    expect(result.details.extensionOptions).toEqual({
      success: true,
      droppedEntries: 0,
    })
    expect(restored.enabled).toBe(false)
    expect(restored.hotkeys).toBeDefined()
    expect(restored.theme).toBeDefined()
  })

  it('keeps the existing data of a store whose old payload fails to migrate', async () => {
    await extensionOptionsService.update({ enabled: false })
    await danmakuOptionsService.update({ speed: 2 })

    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        extensionOptions: { data: null, version: 20 },
        danmakuOptions: { data: null, version: 3 },
      },
    })

    expect(result.success).toBe(false)
    expect(result.details.extensionOptions?.success).toBe(false)
    expect(result.details.danmakuOptions?.success).toBe(false)
    expect((await extensionOptionsService.get()).enabled).toBe(false)
    expect((await danmakuOptionsService.get()).speed).toBe(2)
  })

  it('keeps the existing mount configs when an old payload is not a list', async () => {
    await seedStores()
    const before = await mountConfigService.getAll()

    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        mountConfig: { data: 'i-am-a-string', version: 1 },
      },
    })

    expect(result.details.mountConfig?.success).toBe(false)
    expect(await mountConfigService.getAll()).toEqual(before)
  })

  it('validates an old payload against the current schema once it is migrated', async () => {
    await seedStores()
    const before = await mountConfigService.getAll()

    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        mountConfig: { data: [null], version: 1 },
      },
    })

    expect(result.details.mountConfig?.success).toBe(false)
    expect(await mountConfigService.getAll()).toEqual(before)
  })

  it('migrates old mount configs against the integrations in the same backup', async () => {
    const integrationInput = createIntegrationInput('restored integration')
    integrationInput.policy.title.selector = [{ value: '//h1', quick: false }]
    const integration = zIntegration.parse(integrationInput)

    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        integrationPolicy: {
          data: [integration],
          version: integrationPolicyService.options.latestVersion,
        },
        mountConfig: {
          data: [
            {
              id: '3f2504e0-4f89-41d3-9a0c-0305e82c3303',
              name: 'old config',
              patterns: ['https://example.com/*'],
              mediaQuery: 'video',
              enabled: true,
              integration: integration.id,
            },
          ],
          version: 4,
        },
      },
    })

    expect(result.success).toBe(true)
    expect(await mountConfigService.getAll()).toMatchObject([
      { name: 'old config', mode: 'xpath', integration: integration.id },
    ])
  })

  it('stores the schema default mode for an old mount config whose integration is not in the backup', async () => {
    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        mountConfig: {
          data: [
            {
              id: '3f2504e0-4f89-41d3-9a0c-0305e82c3303',
              name: 'old config',
              patterns: ['https://example.com/*'],
              mediaQuery: 'video',
              enabled: true,
              integration: 'missing-integration',
            },
          ],
          version: 4,
        },
      },
    })

    expect(result.details.mountConfig).toEqual({
      success: true,
      droppedEntries: 0,
    })
    const [restored] = await mountConfigService.getAll()
    expect(restored.mode).toBe('manual')
  })

  it('stores the coerced value of a restored option the schema coerces', async () => {
    const current = await extensionOptionsService.get()

    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        extensionOptions: {
          data: {
            ...current,
            retentionPolicy: { enabled: true, deleteCommentsAfter: '30' },
          },
          version: extensionOptionsService.options.latestVersion,
        },
      },
    })

    expect(result.details.extensionOptions).toEqual({
      success: true,
      droppedEntries: 0,
    })
    expect(
      (await extensionOptionsService.get()).retentionPolicy.deleteCommentsAfter
    ).toBe(30)
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
      ] as unknown as IntegrationV1[]) // lint-specs-allow-cast: v1 stored shape carries fields the V1 type omits
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

    expect(result.details.integrationPolicy).toMatchObject({
      success: true,
      droppedEntries: 1,
    })
    expect(
      (await integrationPolicyService.getAll()).map((i) => i.name)
    ).toEqual(['usable'])
  })

  it('drops a restored source its manifest does not accept, saying which and why', async () => {
    const valid = {
      id: 'home',
      manifestId: 'dandanplay',
      customName: 'Home',
      enabled: true,
      configValues: { baseUrl: 'https://ddp.home.example' },
    }
    const unavailable = { ...valid, id: 'gone', manifestId: 'not-installed' }
    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        providerConfig: {
          data: [
            valid,
            { ...valid, id: 'no-server', configValues: { chConvert: 9 } },
            unavailable,
          ],
          version: providerConfigService.options.latestVersion,
        },
      },
    })

    expect(result.details.providerConfig).toMatchObject({
      success: true,
      droppedEntries: 1,
      dropped: [
        { id: 'no-server', reason: expect.stringMatching(/chConvert/) },
      ],
    })
    expect(await providerConfigService.getAll()).toEqual([valid, unavailable])
  })

  it('restores a built-in without a server the backup set on it', async () => {
    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        providerConfig: {
          data: [
            {
              id: 'dandanplay',
              manifestId: 'dandanplay',
              customName: null,
              enabled: true,
              configValues: {
                baseUrl: 'https://dev-proxy.example/ddp',
                chConvert: 1,
              },
            },
          ],
          version: providerConfigService.options.latestVersion,
        },
      },
    })

    expect(result.details.providerConfig).toEqual({
      success: true,
      droppedEntries: 0,
    })
    expect((await providerConfigService.getAll())[0].configValues).toEqual({
      chConvert: 1,
    })
  })

  it('tidies a blank name on restore instead of dropping the source', async () => {
    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        providerConfig: {
          data: [
            {
              id: 'vod-1',
              manifestId: 'legacy:maccms',
              customName: '   ',
              enabled: true,
              configValues: {
                danmakuBaseUrl: 'https://vod.example/danmaku',
                danmuicuBaseUrl: 'https://vod.example/danmuicu',
              },
            },
          ],
          version: providerConfigService.options.latestVersion,
        },
      },
    })

    expect(result.details.providerConfig).toEqual({
      success: true,
      droppedEntries: 0,
    })
    expect((await providerConfigService.getAll())[0].customName).toBe(
      'vod.example/danmaku'
    )
  })

  it('restores the v1.5.0 backup file shipped as an e2e fixture', async () => {
    const legacyBackup = readLegacyBackup()

    const storeNames = Object.keys(
      backupDataSchema.parse(legacyBackup).services
    )
    expect(storeNames).toContain('extensionOptions')

    const result = await configStateService.restoreState(legacyBackup)

    expect(result.details).toEqual(
      Object.fromEntries(
        storeNames.map((name) => {
          return [name, { success: true, droppedEntries: 0 }]
        })
      )
    )
    expect(result.success).toBe(true)
  })

  it('refuses a current danmakuOptions payload with the wrong types and keeps the existing options', async () => {
    await danmakuOptionsService.update({ speed: 2 })

    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        danmakuOptions: {
          data: { speed: 'not-a-number', style: 42 },
          version: danmakuOptionsService.options.latestVersion,
        },
      },
    })

    expect(result.details.danmakuOptions?.success).toBe(false)
    expect((await danmakuOptionsService.get()).speed).toBe(2)
  })

  it('restores danmakuOptions saved before overlap existed, migrated from version 1', async () => {
    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        danmakuOptions: {
          data: {
            show: true,
            filterLevel: 0,
            filters: [{ type: 'text', value: 'spoiler', enabled: true }],
            speed: 1.5,
            style: { opacity: 0.8, fontSize: 24, fontFamily: 'sans-serif' },
          },
          version: 1,
        },
      },
    })

    expect(result.details.danmakuOptions).toEqual({
      success: true,
      droppedEntries: 0,
    })
    expect((await danmakuOptionsService.get()).speed).toBe(1.5)
  })

  it('keeps danmakuOptions keys from older versions that the schema does not declare', async () => {
    const current = await danmakuOptionsService.get()

    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        danmakuOptions: {
          data: {
            ...current,
            smartMask: true,
            style: { ...current.style, customCss: '' },
          },
          version: danmakuOptionsService.options.latestVersion,
        },
      },
    })

    expect(result.details.danmakuOptions).toEqual({
      success: true,
      droppedEntries: 0,
    })
    expect(await danmakuOptionsService.get()).toMatchObject({
      smartMask: true,
      style: { customCss: '' },
    })
  })

  it('refuses an aiProviderConfig payload that is not a list and keeps the existing providers', async () => {
    await seedStores()
    const before = await aiProviderConfigService.getAll()

    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        aiProviderConfig: { data: 'totally-not-an-array', version: 1 },
      },
    })

    expect(result.details.aiProviderConfig?.success).toBe(false)
    expect(await aiProviderConfigService.getAll()).toEqual(before)
    expect(await aiProviderConfigService.get('ai-1')).toBeDefined()
  })

  it('drops a restored AI provider without an id, which could never be found again', async () => {
    const result = await configStateService.restoreState({
      meta: { version: 1, timestamp: 1 },
      services: {
        aiProviderConfig: {
          data: [
            {
              id: 'built-in',
              isBuiltIn: true,
              name: 'Danmaku Anywhere AI',
              enabled: true,
              provider: 'built-in',
            },
            {
              isBuiltIn: false,
              name: 'no id',
              enabled: true,
              provider: 'built-in',
            },
          ],
          version: 1,
        },
      },
    })

    expect(result.details.aiProviderConfig).toMatchObject({
      success: true,
      droppedEntries: 1,
    })
  })

  it('restores a re-export of the migrated v1.5.0 backup without losing data', async () => {
    await configStateService.restoreState(readLegacyBackup())
    const migrated = await configStateService.getState()

    const result = await configStateService.restoreState(
      JSON.parse(JSON.stringify(migrated))
    )
    const restored = await configStateService.getState()

    stores.forEach((store) => {
      expect(result.details[store.name]).toEqual({
        success: true,
        droppedEntries: 0,
      })
    })
    expect(result.success).toBe(true)
    expect(restored.services).toEqual(migrated.services)
  })
})
