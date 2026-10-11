import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { PROXY_DDP_BASE_URL } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { readV150Store, seedV150Store } from '@/tests/v150Backup'
import { UpgradeService } from './UpgradeService'

/**
 * Runs the whole startup upgrade through the real container for a profile
 * older than providerConfig: extensionOptions at version 20 holding
 * danmakuSources and no providerConfig store. Asserts the three built-ins (and
 * the custom MacCMS source when configured) are derived from danmakuSources,
 * the provider store lands at the current version before the extension
 * version is recorded, and danmakuSources is gone. A failed provider write fails the
 * upgrade and leaves extensionOptions as it was, so the next start redoes it.
 */

function createDanmakuSources(custom: Record<string, unknown>) {
  return {
    dandanplay: {
      enabled: false,
      baseUrl: '',
      useCustomRoot: false,
      chConvert: 2,
    },
    bilibili: {
      enabled: true,
      danmakuTypePreference: 'protobuf',
      protobufLimitPerMin: 200,
    },
    tencent: { enabled: true, limitPerMin: 200 },
    iqiyi: { enabled: false, limitPerMin: 200 },
    custom,
  }
}

const unconfiguredCustom = {
  enabled: true,
  baseUrl: '',
  danmuicuBaseUrl: '',
  stripColor: true,
}

const derivedBuiltins: ProviderConfig[] = [
  {
    id: 'dandanplay',
    manifestId: 'dandanplay',
    name: 'DanDanPlay',
    enabled: false,
    configValues: { baseUrl: PROXY_DDP_BASE_URL, chConvert: 2 },
  },
  {
    id: 'bilibili',
    manifestId: 'bilibili',
    name: 'Bilibili',
    enabled: true,
    configValues: { danmakuFormat: 'protobuf' },
  },
  {
    id: 'tencent',
    manifestId: 'tencent',
    name: 'Tencent',
    enabled: true,
    configValues: {},
  },
]

async function seedLegacyProfile(custom: Record<string, unknown>) {
  await fakeBrowser.storage.sync.set({
    extensionOptions: {
      version: 20,
      data: {
        enabled: true,
        lang: 'zh',
        theme: { colorMode: 'system' },
        hotkeys: {},
        debug: false,
        danmakuSources: createDanmakuSources(custom),
      },
    },
  })
}

async function upgradeLegacyProfile(custom: Record<string, unknown>) {
  await seedLegacyProfile(custom)
  const container = createUpgradeContainer({ ready: false })
  await container.get(UpgradeService).upgrade()
  return container.get(ProviderConfigService)
}

async function readStoredStore(name: string) {
  const entry = await fakeBrowser.storage.sync.get(name)
  return entry[name] as { version: number; data: unknown } | undefined
}

async function readStoredProviders() {
  const entry = await fakeBrowser.storage.sync.get('providerConfig')
  return entry.providerConfig as { version: number; data: ProviderConfig[] }
}

describe('startup upgrade of a profile that predates providerConfig', () => {
  it('derives the three built-ins from danmakuSources with their enabled flags and chConvert', async () => {
    await upgradeLegacyProfile(unconfiguredCustom)

    expect((await readStoredProviders()).data).toEqual(derivedBuiltins)
  })

  it('stores the derived providers at the current providerConfig version', async () => {
    const service = await upgradeLegacyProfile(unconfiguredCustom)

    expect((await readStoredProviders()).version).toBe(5)
    expect(service.options.latestVersion).toBe(5)
  })

  it('appends a MacCMS source when the legacy custom source was configured', async () => {
    await upgradeLegacyProfile({
      enabled: true,
      baseUrl: 'https://vod.example/danmaku',
      danmuicuBaseUrl: 'https://api.danmu.example',
      stripColor: false,
    })

    expect((await readStoredProviders()).data.at(-1)).toEqual({
      id: 'legacy:maccms',
      manifestId: 'legacy:maccms',
      name: 'VOD',
      enabled: true,
      configValues: {
        danmakuBaseUrl: 'https://vod.example/danmaku',
        danmuicuBaseUrl: 'https://api.danmu.example',
        stripColor: false,
      },
    })
    expect((await readStoredProviders()).data.map((c) => c.id)).toEqual([
      'dandanplay',
      'bilibili',
      'tencent',
      'legacy:maccms',
    ])
  })

  it('removes danmakuSources from extensionOptions and ends at the latest version', async () => {
    await upgradeLegacyProfile(unconfiguredCustom)

    const stored = await readStoredStore('extensionOptions')
    expect(stored?.version).toBe(27)
    expect(stored?.data).not.toHaveProperty('danmakuSources')
    expect(stored?.data).toMatchObject({ lang: 'zh' })
  })

  it('has the providers stored before the version of a rewound v1.5.0 profile is recorded', async () => {
    for (const name of [
      'danmakuOptions',
      'mountConfig',
      'aiProviderConfig',
      'integrationPolicy',
    ]) {
      await seedV150Store(name)
    }
    const fixture = readV150Store<Record<string, unknown>>('extensionOptions')
    await fakeBrowser.storage.sync.set({
      extensionOptions: {
        version: 20,
        data: {
          ...fixture.data,
          danmakuSources: createDanmakuSources(unconfiguredCustom),
        },
      },
    })

    const container = createUpgradeContainer({ ready: false })
    const readiness = container.get(ReadinessService)
    const setVersion = readiness.setVersion.bind(readiness)
    let providersAtVersionRecord: unknown
    vi.spyOn(readiness, 'setVersion').mockImplementation(async (version) => {
      providersAtVersionRecord = await readStoredProviders()
      return setVersion(version)
    })

    await container.get(UpgradeService).upgrade()

    expect(providersAtVersionRecord).toEqual({
      version: 5,
      data: derivedBuiltins,
    })
  })

  describe('when the provider write fails', () => {
    async function failFirstUpgrade() {
      await seedLegacyProfile(unconfiguredCustom)
      vi.spyOn(OptionsService.prototype, 'setUnblocked').mockRejectedValueOnce(
        new Error('QUOTA_BYTES quota exceeded')
      )
      const container = createUpgradeContainer({ ready: false })
      return container.get(UpgradeService).upgrade()
    }

    it('rejects without recording the extension version', async () => {
      await expect(failFirstUpgrade()).rejects.toThrow(/extensionOptions/)

      expect(await fakeBrowser.storage.local.get('lastVersion')).toEqual({})
    })

    it('keeps extensionOptions at version 20 with its danmakuSources', async () => {
      await failFirstUpgrade().catch(() => {})

      const stored = await readStoredStore('extensionOptions')
      expect(stored?.version).toBe(20)
      expect(stored?.data).toHaveProperty(
        'danmakuSources',
        createDanmakuSources(unconfiguredCustom)
      )
    })

    it('derives the same providers on the next start', async () => {
      await failFirstUpgrade().catch(() => {})

      await createUpgradeContainer({ ready: false })
        .get(UpgradeService)
        .upgrade()

      expect((await readStoredProviders()).data).toEqual(derivedBuiltins)
      expect((await readStoredStore('extensionOptions'))?.version).toBe(27)
    })
  })
})
