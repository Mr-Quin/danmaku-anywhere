import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { describe, expect, it } from 'vitest'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { migrateOptions } from '@/common/options/OptionsService/migrationOptions'
import type {
  Version,
  VersionConfig,
} from '@/common/options/OptionsService/types'
import { PROXY_DDP_BASE_URL } from './constant'
import {
  migrateBuiltinPrefixedProviderIds,
  migrateDanDanPlayApiBaseUrl,
  migrateDanmakuSourcesToProviders,
  migrateProviderConfigsToFlat,
} from './migration'
import type { ProviderConfig } from './schema'
import { ProviderConfigService } from './service'

describe('migrateDanmakuSourcesToProviders', () => {
  describe('basic migration', () => {
    it('should migrate all built-in providers with default settings', () => {
      const oldSources = {
        dandanplay: {
          enabled: true,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
        },
        tencent: {
          enabled: true,
        },
        iqiyi: {
          enabled: false,
        },
        custom: {
          enabled: false,
          baseUrl: '',
          danmuicuBaseUrl: '',
          stripColor: false,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      expect(providers).toHaveLength(3) // Only built-in providers
      expect(providers[0].manifestId).toBe('dandanplay')
      expect(providers[1].manifestId).toBe('bilibili')
      expect(providers[2].manifestId).toBe('tencent')
    })

    it('should migrate with the sample data structure from user', () => {
      const oldSources = {
        dandanplay: {
          enabled: true,
          chConvert: 1,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'protobuf',
        },
        tencent: {
          enabled: true,
        },
        iqiyi: {
          enabled: false,
        },
        custom: {
          enabled: true,
          baseUrl: 'https://vs.okcdn100.top',
          danmuicuBaseUrl: 'https://danmu.56uxi.com',
          stripColor: true,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      // Should have 4 providers: 3 built-in + 1 custom MacCMS
      expect(providers).toHaveLength(4)

      const ddp = providers[0]
      expect(ddp.id).toBe('dandanplay')
      expect(ddp.manifestId).toBe('dandanplay')
      expect(ddp.enabled).toBe(true)
      expect(ddp.configValues.baseUrl).toBe(PROXY_DDP_BASE_URL)
      expect(ddp.configValues.chConvert).toBe(1)

      const bili = providers[1]
      expect(bili.id).toBe('bilibili')
      expect(bili.manifestId).toBe('bilibili')
      expect(bili.enabled).toBe(true)
      expect(bili.configValues.danmakuFormat).toBe('protobuf')

      const tencent = providers[2]
      expect(tencent.id).toBe('tencent')
      expect(tencent.manifestId).toBe('tencent')
      expect(tencent.enabled).toBe(true)

      const maccms = providers[3]
      expect(maccms.id).toBe('legacy:maccms')
      expect(maccms.manifestId).toBe('legacy:maccms')
      expect(maccms.name).toBe('VOD')
      expect(maccms.enabled).toBe(true)
      expect(maccms.configValues.danmakuBaseUrl).toBe('https://vs.okcdn100.top')
      expect(maccms.configValues.danmuicuBaseUrl).toBe(
        'https://danmu.56uxi.com'
      )
      expect(maccms.configValues.stripColor).toBe(true)
    })
  })

  describe('chConvert option preservation', () => {
    it('should preserve chConvert option for DanDanPlay', () => {
      const oldSources = {
        dandanplay: {
          enabled: true,
          chConvert: DanDanChConvert.Simplified,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
        },
        tencent: {
          enabled: true,
        },
        iqiyi: {
          enabled: false,
        },
        custom: {
          enabled: false,
          baseUrl: '',
          danmuicuBaseUrl: '',
          stripColor: false,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      expect(providers).toHaveLength(3)

      const ddp = providers[0]
      expect(ddp.manifestId).toBe('dandanplay')
      expect(ddp.configValues.chConvert).toBe(DanDanChConvert.Simplified)
    })
  })

  describe('custom MacCMS provider migration', () => {
    it('should create MacCMS provider when valid URLs are provided', () => {
      const oldSources = {
        dandanplay: {
          enabled: true,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
        },
        tencent: {
          enabled: true,
        },
        iqiyi: {
          enabled: false,
        },
        custom: {
          enabled: true,
          baseUrl: 'https://maccms.example.com',
          danmuicuBaseUrl: 'https://danmu.example.com',
          stripColor: true,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      expect(providers).toHaveLength(4) // 3 built-in + 1 custom MacCMS

      const maccms = providers[3]
      expect(maccms.id).toBe('legacy:maccms')
      expect(maccms.manifestId).toBe('legacy:maccms')
      expect(maccms.name).toBe('VOD')
      expect(maccms.enabled).toBe(true)
      expect(maccms.configValues.danmakuBaseUrl).toBe(
        'https://maccms.example.com'
      )
      expect(maccms.configValues.danmuicuBaseUrl).toBe(
        'https://danmu.example.com'
      )
      expect(maccms.configValues.stripColor).toBe(true)
    })

    it('should NOT create MacCMS provider when URLs are empty', () => {
      const oldSources = {
        dandanplay: {
          enabled: true,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
        },
        tencent: {
          enabled: true,
        },
        iqiyi: {
          enabled: false,
        },
        custom: {
          enabled: true,
          baseUrl: '',
          danmuicuBaseUrl: '',
          stripColor: false,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      expect(providers).toHaveLength(3) // Only built-in providers
      expect(
        providers.find((p) => p.manifestId === 'legacy:maccms')
      ).toBeUndefined()
    })

    it('should NOT create MacCMS provider when only one URL is provided', () => {
      const oldSources = {
        dandanplay: {
          enabled: true,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
        },
        tencent: {
          enabled: true,
        },
        iqiyi: {
          enabled: false,
        },
        custom: {
          enabled: true,
          baseUrl: 'https://maccms.example.com',
          danmuicuBaseUrl: '', // Missing this URL
          stripColor: false,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      expect(providers).toHaveLength(3)
      expect(
        providers.find((p) => p.manifestId === 'legacy:maccms')
      ).toBeUndefined()
    })
  })

  describe('enabled/disabled state preservation', () => {
    it('should preserve enabled state for all providers', () => {
      const oldSources = {
        dandanplay: {
          enabled: false,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: false,
          danmakuTypePreference: 'xml',
        },
        tencent: {
          enabled: false,
        },
        iqiyi: {
          enabled: false,
        },
        custom: {
          enabled: false,
          baseUrl: '',
          danmuicuBaseUrl: '',
          stripColor: false,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      providers.forEach((provider) => {
        expect(provider.enabled).toBe(false)
      })
    })
  })

  describe('default values', () => {
    it('should use default values when old config is missing providers', () => {
      const oldSources = {
        // Only dandanplay provided
        dandanplay: {
          enabled: true,
          chConvert: DanDanChConvert.None,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(
        oldSources as DanmakuSources
      )

      expect(providers).toHaveLength(3)

      const bilibili = providers.find((p) => p.manifestId === 'bilibili')
      expect(bilibili).toBeDefined()
      expect(bilibili?.enabled).toBe(true) // Default enabled

      const tencent = providers.find((p) => p.manifestId === 'tencent')
      expect(tencent).toBeDefined()
      expect(tencent?.enabled).toBe(true) // Default enabled
    })

    it('omits danmakuFormat from configValues when legacy record lacks danmakuTypePreference', () => {
      const oldSources = {
        bilibili: { enabled: true },
      }
      const providers = migrateDanmakuSourcesToProviders(
        oldSources as DanmakuSources
      )
      const bili = providers.find((p) => p.manifestId === 'bilibili')
      expect(bili?.configValues).toEqual({})
    })

    it('should fall back to defaults when migration fails completely', () => {
      // Pass invalid data to trigger catch block
      const providers = migrateDanmakuSourcesToProviders(
        null as unknown as DanmakuSources // lint-specs-allow-cast: deliberately invalid input to exercise the catch/fallback path
      )

      expect(providers).toHaveLength(3)
      expect(providers[0].manifestId).toBe('dandanplay')
      expect(providers[1].manifestId).toBe('bilibili')
      expect(providers[2].manifestId).toBe('tencent')
    })
  })

  describe('URL trimming', () => {
    it('should trim whitespace from URLs', () => {
      const oldSources = {
        dandanplay: {
          enabled: true,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
        },
        tencent: {
          enabled: true,
        },
        iqiyi: {
          enabled: false,
        },
        custom: {
          enabled: true,
          baseUrl: '  https://maccms.example.com  ',
          danmuicuBaseUrl: '  https://danmu.example.com  ',
          stripColor: false,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      const maccms = providers.find((p) => p.manifestId === 'legacy:maccms')
      expect(maccms?.configValues.danmakuBaseUrl).toBe(
        'https://maccms.example.com'
      )
      expect(maccms?.configValues.danmuicuBaseUrl).toBe(
        'https://danmu.example.com'
      )
    })
  })
})

// The providerConfig store of a real v1.5.0 install, with secrets and hosts
// redacted.
const v150ProviderConfigs = [
  {
    enabled: true,
    id: 'd9d068cc-d7a5-4277-990b-73b28f7637f8',
    impl: 'DanDanPlay',
    isBuiltIn: false,
    name: 'DanDanPlay',
    options: {
      auth: {
        enabled: true,
        headers: [
          { key: 'X-AppId', value: 'REDACTED_SECRET' },
          { key: 'X-AppSecret', value: 'REDACTED_SECRET' },
        ],
      },
      baseUrl: 'https://ddp.selfhosted.example/api',
    },
    type: 'DanDanPlayCompatible',
  },
  {
    enabled: true,
    id: 'builtin:bilibili',
    impl: 'Bilibili',
    isBuiltIn: true,
    name: 'Bilibili',
    options: { danmakuTypePreference: 'xml' },
    type: 'Bilibili',
  },
  {
    enabled: true,
    id: 'builtin:dandanplay',
    impl: 'DanDanPlay',
    isBuiltIn: true,
    name: 'DanDanPlay',
    options: { chConvert: 0 },
    type: 'DanDanPlay',
  },
  {
    enabled: true,
    id: '21999133-1b22-4e15-a48b-a8c6677cd902',
    impl: 'Custom',
    isBuiltIn: false,
    name: 'VOD',
    options: {
      danmakuBaseUrl: 'https://vod.selfhosted.example/danmaku',
      danmuicuBaseUrl: 'https://vod.selfhosted.example/danmuicu',
      stripColor: false,
    },
    type: 'MacCMS',
  },
  {
    enabled: false,
    id: 'builtin:tencent',
    impl: 'Tencent',
    isBuiltIn: true,
    name: 'Tencent',
    options: {},
    type: 'Tencent',
  },
  {
    enabled: true,
    id: 'e15d5979-e823-4ce8-a2ab-513dc358dae1',
    impl: 'DanDanPlay',
    isBuiltIn: false,
    name: 'Danmu API',
    options: {
      auth: { enabled: false, headers: [] },
      baseUrl: 'https://danmu.selfhosted.example',
    },
    type: 'DanDanPlayCompatible',
  },
]

const upgradedV150ProviderConfigs: ProviderConfig[] = [
  {
    id: 'd9d068cc-d7a5-4277-990b-73b28f7637f8',
    manifestId: 'dandanplay',
    name: 'DanDanPlay',
    enabled: true,
    configValues: {
      auth: {
        enabled: true,
        headers: [
          { key: 'X-AppId', value: 'REDACTED_SECRET' },
          { key: 'X-AppSecret', value: 'REDACTED_SECRET' },
        ],
      },
      baseUrl: 'https://ddp.selfhosted.example',
    },
  },
  {
    id: 'bilibili',
    manifestId: 'bilibili',
    name: 'Bilibili',
    enabled: true,
    configValues: { danmakuFormat: 'xml' },
  },
  {
    id: 'dandanplay',
    manifestId: 'dandanplay',
    name: 'DanDanPlay',
    enabled: true,
    configValues: { baseUrl: PROXY_DDP_BASE_URL, chConvert: 0 },
  },
  {
    id: '21999133-1b22-4e15-a48b-a8c6677cd902',
    manifestId: 'legacy:maccms',
    name: 'VOD',
    enabled: true,
    configValues: {
      danmakuBaseUrl: 'https://vod.selfhosted.example/danmaku',
      danmuicuBaseUrl: 'https://vod.selfhosted.example/danmuicu',
      stripColor: false,
    },
  },
  {
    id: 'tencent',
    manifestId: 'tencent',
    name: 'Tencent',
    enabled: false,
    configValues: {},
  },
  {
    id: 'e15d5979-e823-4ce8-a2ab-513dc358dae1',
    manifestId: 'dandanplay',
    name: 'Danmu API',
    enabled: true,
    configValues: {
      auth: { enabled: false, headers: [] },
      baseUrl: 'https://danmu.selfhosted.example',
    },
  },
]

function upgradeFromV150(data: unknown): ProviderConfig[] {
  const versions: Version[] = []
  const options = {
    version: (version: number, config: VersionConfig) => {
      versions.push({ ...config, version })
      return options
    },
  }
  const logger = { sub: () => logger, debug: () => {} } as never
  new ProviderConfigService(logger, (() => options) as never)
  return migrateOptions<ProviderConfig[]>(
    { data: data as ProviderConfig[], version: 1 },
    versions,
    logger,
    {}
  ).data
}

describe('providerConfig upgrade chain', () => {
  it('translates a real v1.5.0 store to the current shape', () => {
    expect(upgradeFromV150(v150ProviderConfigs)).toEqual(
      upgradedV150ProviderConfigs
    )
  })

  it('drops a bad entry and keeps the rest without adding defaults', () => {
    const [ddp, bilibili, builtinDdp, maccms, , danmuApi] = v150ProviderConfigs
    const corruptTencent = { id: 'builtin:tencent', name: 'Tencent' }

    const upgraded = upgradeFromV150([
      ddp,
      bilibili,
      builtinDdp,
      maccms,
      corruptTencent,
      danmuApi,
    ])

    expect(upgraded).toEqual(
      upgradedV150ProviderConfigs.filter((config) => config.id !== 'tencent')
    )
  })

  it('throws on a store that is not a list', () => {
    expect(() => upgradeFromV150({ not: 'a list' })).toThrow()
  })
})

describe('migrateProviderConfigsToFlat', () => {
  it('keeps the stored id and drops impl and isBuiltIn', () => {
    const [flat] = migrateProviderConfigsToFlat([v150ProviderConfigs[2]])

    expect(flat).toEqual({
      id: 'builtin:dandanplay',
      manifestId: 'dandanplay',
      name: 'DanDanPlay',
      enabled: true,
      configValues: { baseUrl: PROXY_DDP_BASE_URL, chConvert: 0 },
    })
  })

  it('migrates a record with no options', () => {
    const [flat] = migrateProviderConfigsToFlat([
      { ...v150ProviderConfigs[1], options: undefined },
    ])

    expect(flat.configValues).toEqual({})
  })

  it.each([
    ['an unknown type', { ...v150ProviderConfigs[1], type: 'Youku' }],
    ['no type', { ...v150ProviderConfigs[1], type: undefined }],
    ['no id', { ...v150ProviderConfigs[1], id: undefined }],
    ['an empty name', { ...v150ProviderConfigs[1], name: '' }],
    ['no enabled flag', { ...v150ProviderConfigs[1], enabled: undefined }],
    ['a non-object', 'builtin:bilibili'],
    ['null', null],
  ])('drops a record with %s', (_, record) => {
    const out = migrateProviderConfigsToFlat([record, v150ProviderConfigs[4]])

    expect(out.map((config) => config.id)).toEqual(['builtin:tencent'])
  })
})

describe('migrateBuiltinPrefixedProviderIds', () => {
  it('strips the builtin: prefix and leaves other ids alone', () => {
    const out = migrateBuiltinPrefixedProviderIds([
      {
        id: 'builtin:bilibili',
        manifestId: 'builtin:bilibili',
        name: 'Bilibili',
        enabled: true,
        configValues: {},
      },
      {
        id: 'e15d5979-e823-4ce8-a2ab-513dc358dae1',
        manifestId: 'builtin:dandanplay',
        name: 'Danmu API',
        enabled: true,
        configValues: {},
      },
      {
        id: '21999133-1b22-4e15-a48b-a8c6677cd902',
        manifestId: 'legacy:maccms',
        name: 'VOD',
        enabled: true,
        configValues: {},
      },
    ])

    expect(out.map(({ id, manifestId }) => [id, manifestId])).toEqual([
      ['bilibili', 'bilibili'],
      ['e15d5979-e823-4ce8-a2ab-513dc358dae1', 'dandanplay'],
      ['21999133-1b22-4e15-a48b-a8c6677cd902', 'legacy:maccms'],
    ])
  })
})

describe('migrateDanDanPlayApiBaseUrl', () => {
  const customDdp = (baseUrl: string) => ({
    id: 'custom-ddp-1',
    manifestId: 'dandanplay',
    name: 'My DDP',
    impl: DanmakuSourceType.DanDanPlay,
    enabled: true,
    isBuiltIn: false,
    configValues: { baseUrl, auth: { enabled: false, headers: [] } },
  })

  it('strips a trailing /api from a custom DanDanPlay baseUrl', () => {
    const out = migrateDanDanPlayApiBaseUrl([
      customDdp('https://api.dandanplay.net/api'),
    ])
    expect(out[0].configValues.baseUrl).toBe('https://api.dandanplay.net')
    // Other configValues are preserved.
    expect(out[0].configValues.auth).toEqual({ enabled: false, headers: [] })
  })

  it('strips a trailing /api/ with a slash', () => {
    const out = migrateDanDanPlayApiBaseUrl([
      customDdp('https://x.example/api/'),
    ])
    expect(out[0].configValues.baseUrl).toBe('https://x.example')
  })

  it('leaves a baseUrl without an /api suffix unchanged', () => {
    const out = migrateDanDanPlayApiBaseUrl([customDdp('https://x.example')])
    expect(out[0].configValues.baseUrl).toBe('https://x.example')
  })

  it('does not strip /api that is not a trailing path segment', () => {
    const out = migrateDanDanPlayApiBaseUrl([
      customDdp('https://x.example/myapi'),
    ])
    expect(out[0].configValues.baseUrl).toBe('https://x.example/myapi')
  })

  it('leaves the built-in DanDanPlay (proxy) config untouched', () => {
    const builtinDdp = {
      id: 'dandanplay',
      manifestId: 'dandanplay',
      name: 'DanDanPlay',
      impl: DanmakuSourceType.DanDanPlay,
      enabled: true,
      isBuiltIn: true,
      configValues: { baseUrl: 'https://proxy.example/ddp' },
    }
    const out = migrateDanDanPlayApiBaseUrl([builtinDdp])
    expect(out[0]).toBe(builtinDdp)
  })

  it('ignores non-DanDanPlay providers', () => {
    const maccms = {
      id: 'legacy:maccms',
      manifestId: 'legacy:maccms',
      name: 'MacCMS',
      impl: DanmakuSourceType.MacCMS,
      enabled: true,
      isBuiltIn: false,
      configValues: { danmakuBaseUrl: 'https://m.example/api' },
    }
    const out = migrateDanDanPlayApiBaseUrl([maccms])
    expect(out[0]).toBe(maccms)
  })

  it('handles a missing baseUrl without throwing', () => {
    const out = migrateDanDanPlayApiBaseUrl([
      {
        id: 'custom-ddp-2',
        manifestId: 'dandanplay',
        name: 'My DDP',
        enabled: true,
        configValues: {},
      },
    ])
    expect(out[0].configValues.baseUrl).toBeUndefined()
  })
})
