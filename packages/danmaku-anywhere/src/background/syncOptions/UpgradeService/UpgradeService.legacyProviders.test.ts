import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it } from 'vitest'
import { PROXY_DDP_BASE_URL } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { UpgradeService } from './UpgradeService'

/**
 * Runs the whole startup upgrade through the real container for a profile
 * older than providerConfig: extensionOptions at version 20 holding
 * danmakuSources and no providerConfig store. Asserts the three built-ins (and
 * the custom MacCMS source when configured) are derived from danmakuSources,
 * the provider store lands at the current version, and danmakuSources is gone.
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

async function upgradeLegacyProfile(custom: Record<string, unknown>) {
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

    await expect
      .poll(async () => (await readStoredProviders()).data)
      .toEqual([
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
      ])
  })

  it('stores the derived providers at the current providerConfig version', async () => {
    const service = await upgradeLegacyProfile(unconfiguredCustom)

    await expect
      .poll(async () => (await readStoredProviders()).data.length)
      .toBe(3)
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

    await expect
      .poll(async () => (await readStoredProviders()).data.at(-1))
      .toEqual({
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
})
