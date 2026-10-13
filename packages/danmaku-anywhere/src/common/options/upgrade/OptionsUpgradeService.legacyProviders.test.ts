import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { PROXY_DDP_BASE_URL } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import {
  failNextProviderWrite,
  holdProviderWrites,
  isSettledAfterMicrotasks,
} from '@/tests/providerConfigWrites'
import { readV150Store, seedV150Store } from '@/tests/v150Backup'
import { OptionsUpgradeService } from './OptionsUpgradeService'

/**
 * Runs the whole startup upgrade through the real container for a profile
 * older than providerConfig: extensionOptions at version 20 holding
 * danmakuSources and no providerConfig store. Asserts the three built-ins (and
 * the custom MacCMS source when configured) are derived from danmakuSources,
 * the provider store lands at the current version before extensionOptions
 * does, and danmakuSources is gone. A failed provider write fails the upgrade,
 * leaves extensionOptions as it was and readiness failed, and the next start
 * redoes it.
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
  await container.get(OptionsUpgradeService).upgrade()
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

  it('has the providers stored before a rewound v1.5.0 extensionOptions reaches its latest version', async () => {
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

    const set = fakeBrowser.storage.sync.set.bind(fakeBrowser.storage.sync)
    let providersAtLatestExtensionOptions: unknown
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockImplementation(
      async (items) => {
        if ('extensionOptions' in items) {
          providersAtLatestExtensionOptions = await readStoredProviders()
        }
        return set(items)
      }
    )

    await createUpgradeContainer({ ready: false })
      .get(OptionsUpgradeService)
      .upgrade()

    expect(providersAtLatestExtensionOptions).toEqual({
      version: 5,
      data: derivedBuiltins,
    })
  })

  it('does not resolve until the derived providers are written', async () => {
    await seedLegacyProfile(unconfiguredCustom)
    const release = holdProviderWrites()

    const pending = createUpgradeContainer({ ready: false })
      .get(OptionsUpgradeService)
      .upgrade()

    expect(await isSettledAfterMicrotasks(pending)).toBe(false)
    release()
    await pending
    expect((await readStoredProviders()).data).toEqual(derivedBuiltins)
  })

  it('rejects and keeps danmakuSources when storage rejects the provider write', async () => {
    await seedLegacyProfile(unconfiguredCustom)
    failNextProviderWrite(new Error('QUOTA_BYTES quota exceeded'))

    await expect(
      createUpgradeContainer({ ready: false })
        .get(OptionsUpgradeService)
        .upgrade()
    ).rejects.toThrow(/extensionOptions/)

    const stored = await readStoredStore('extensionOptions')
    expect(stored?.version).toBe(20)
    expect(stored?.data).toHaveProperty('danmakuSources')
  })

  describe('when the provider write fails', () => {
    async function failFirstUpgrade() {
      await seedLegacyProfile(unconfiguredCustom)
      vi.spyOn(OptionsService.prototype, 'setUnblocked').mockRejectedValueOnce(
        new Error('QUOTA_BYTES quota exceeded')
      )
      const container = createUpgradeContainer({ ready: false })
      const upgrade = container.get(OptionsUpgradeService).upgrade()
      return { readiness: container.get(ReadinessService), upgrade }
    }

    it('rejects and leaves readiness failed', async () => {
      const { readiness, upgrade } = await failFirstUpgrade()
      readiness.subscribe(() => undefined)

      await expect(upgrade).rejects.toThrow(/extensionOptions/)

      await vi.waitFor(() => {
        expect(readiness.getState()).toMatchObject({ status: 'failed' })
      })
    })

    it('keeps extensionOptions at version 20 with its danmakuSources', async () => {
      const { upgrade } = await failFirstUpgrade()
      await upgrade.catch(() => {})

      const stored = await readStoredStore('extensionOptions')
      expect(stored?.version).toBe(20)
      expect(stored?.data).toHaveProperty(
        'danmakuSources',
        createDanmakuSources(unconfiguredCustom)
      )
    })

    it('derives the same providers on the next start', async () => {
      const { upgrade } = await failFirstUpgrade()
      await upgrade.catch(() => {})

      await createUpgradeContainer({ ready: false })
        .get(OptionsUpgradeService)
        .upgrade()

      expect((await readStoredProviders()).data).toEqual(derivedBuiltins)
      expect((await readStoredStore('extensionOptions'))?.version).toBe(27)
    })
  })
})
