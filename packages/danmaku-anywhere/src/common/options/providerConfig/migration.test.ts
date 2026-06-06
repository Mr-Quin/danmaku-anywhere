import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { describe, expect, it } from 'vitest'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { PROXY_DDP_BASE_URL } from './constant'
import {
  migrateBuiltinPrefixedProviderIds,
  migrateDanDanPlayApiBaseUrl,
  migrateDanmakuSourcesToProviders,
  migrateProviderConfigsToFlat,
} from './migration'

/**
 * Exercises the provider-config migrations from the shipped releases:
 * - `migrateDanmakuSourcesToProviders`: pre-v21 `danmakuSources` blob →
 *   flat ProviderConfig[] with bare built-in ids.
 * - `migrateProviderConfigsToFlat`: v1.4/v1.5 discriminated-union
 *   ProviderConfig records → flat shape (idempotent on already-flat input,
 *   drops corrupted records). The stored `id` is preserved verbatim; the
 *   freshly-derived `manifestId` uses bare built-in ids.
 * - `migrateBuiltinPrefixedProviderIds`: strips the legacy `builtin:` prefix
 *   from stored `id`/`manifestId` and de-duplicates the resulting list.
 */

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
      expect(providers[0].impl).toBe(DanmakuSourceType.DanDanPlay)
      expect(providers[1].manifestId).toBe('bilibili')
      expect(providers[1].impl).toBe(DanmakuSourceType.Bilibili)
      expect(providers[2].manifestId).toBe('tencent')
      expect(providers[2].impl).toBe(DanmakuSourceType.Tencent)
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
      expect(ddp.impl).toBe(DanmakuSourceType.DanDanPlay)
      expect(ddp.enabled).toBe(true)
      expect(ddp.configValues.baseUrl).toBe(PROXY_DDP_BASE_URL)
      expect(ddp.configValues.chConvert).toBe(1)

      const bili = providers[1]
      expect(bili.id).toBe('bilibili')
      expect(bili.manifestId).toBe('bilibili')
      expect(bili.impl).toBe(DanmakuSourceType.Bilibili)
      expect(bili.enabled).toBe(true)
      expect(bili.configValues.danmakuFormat).toBe('protobuf')

      const tencent = providers[2]
      expect(tencent.id).toBe('tencent')
      expect(tencent.manifestId).toBe('tencent')
      expect(tencent.impl).toBe(DanmakuSourceType.Tencent)
      expect(tencent.enabled).toBe(true)

      const maccms = providers[3]
      expect(maccms.id).toBe('legacy:maccms')
      expect(maccms.manifestId).toBe('legacy:maccms')
      expect(maccms.impl).toBe(DanmakuSourceType.MacCMS)
      expect(maccms.name).toBe('MacCMS')
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
      expect(maccms.impl).toBe(DanmakuSourceType.MacCMS)
      expect(maccms.name).toBe('MacCMS')
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
        null as unknown as DanmakuSources
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

describe('migrateProviderConfigsToFlat', () => {
  it('converts all five legacy variants to the flat shape', () => {
    const legacy = [
      {
        id: 'builtin:dandanplay',
        type: 'DanDanPlay',
        name: 'DanDanPlay',
        impl: DanmakuSourceType.DanDanPlay,
        enabled: true,
        isBuiltIn: true,
        options: { chConvert: DanDanChConvert.Simplified },
      },
      {
        id: 'builtin:bilibili',
        type: 'Bilibili',
        name: 'Bilibili',
        impl: DanmakuSourceType.Bilibili,
        enabled: true,
        isBuiltIn: true,
        options: { danmakuTypePreference: 'protobuf' },
      },
      {
        id: 'builtin:tencent',
        type: 'Tencent',
        name: 'Tencent',
        impl: DanmakuSourceType.Tencent,
        enabled: false,
        isBuiltIn: true,
        options: {},
      },
      {
        id: 'compat-1',
        type: 'DanDanPlayCompatible',
        name: 'CompatTest',
        impl: DanmakuSourceType.DanDanPlay,
        enabled: true,
        isBuiltIn: false,
        options: {
          baseUrl: 'https://compat.example',
          auth: { enabled: false, headers: [] },
        },
      },
      {
        id: 'legacy:maccms',
        type: 'MacCMS',
        name: 'MacCMS',
        impl: DanmakuSourceType.MacCMS,
        enabled: true,
        isBuiltIn: false,
        options: {
          danmakuBaseUrl: 'https://m.example',
          danmuicuBaseUrl: 'https://d.example',
          stripColor: true,
        },
      },
    ]

    const flat = migrateProviderConfigsToFlat(legacy)

    expect(flat).toHaveLength(5)

    // The stored `id` is preserved; the derived `manifestId` is the bare id.
    expect(flat[0].manifestId).toBe('dandanplay')
    expect(flat[0].configValues.baseUrl).toBe(PROXY_DDP_BASE_URL)
    expect(flat[0].configValues.chConvert).toBe(DanDanChConvert.Simplified)

    expect(flat[1].manifestId).toBe('bilibili')
    // Field renamed: danmakuTypePreference → danmakuFormat
    expect(flat[1].configValues.danmakuFormat).toBe('protobuf')

    expect(flat[2].manifestId).toBe('tencent')
    expect(flat[2].configValues).toEqual({})

    // A custom DDP server (DanDanPlayCompatible) folds directly onto the
    // unified DanDanPlay manifest, keeping its custom baseUrl.
    expect(flat[3].manifestId).toBe('dandanplay')
    expect(flat[3].isBuiltIn).toBe(false)
    expect(flat[3].configValues.baseUrl).toBe('https://compat.example')

    expect(flat[4].manifestId).toBe('legacy:maccms')
    expect(flat[4].configValues.danmakuBaseUrl).toBe('https://m.example')
    expect(flat[4].configValues.stripColor).toBe(true)
  })

  it('preserves a record that is already flat (idempotent)', () => {
    const alreadyFlat = [
      {
        id: 'dandanplay',
        manifestId: 'dandanplay',
        name: 'DanDanPlay',
        impl: DanmakuSourceType.DanDanPlay,
        enabled: true,
        isBuiltIn: true,
        configValues: { chConvert: DanDanChConvert.None },
      },
    ]

    const out = migrateProviderConfigsToFlat(alreadyFlat)

    expect(out).toEqual(alreadyFlat)
  })

  it('handles missing options field on legacy records', () => {
    const legacy = [
      {
        id: 'builtin:bilibili',
        type: 'Bilibili',
        name: 'Bilibili',
        impl: DanmakuSourceType.Bilibili,
        enabled: true,
        isBuiltIn: true,
        // options field missing entirely
      },
    ]

    const flat = migrateProviderConfigsToFlat(legacy)

    expect(flat).toHaveLength(1)
    expect(flat[0].manifestId).toBe('bilibili')
    expect(flat[0].configValues).toEqual({})
  })

  it('defaults enabled to true when missing on legacy records', () => {
    const legacy = [
      {
        id: 'builtin:dandanplay',
        type: 'DanDanPlay',
        name: 'DanDanPlay',
        impl: DanmakuSourceType.DanDanPlay,
        // enabled missing
        isBuiltIn: true,
        options: { chConvert: DanDanChConvert.None },
      },
    ]

    const flat = migrateProviderConfigsToFlat(legacy)

    expect(flat[0].enabled).toBe(true)
  })

  it('recovers records with missing type by inferring from impl', () => {
    const legacy = [
      {
        id: 'builtin:bilibili',
        // type omitted entirely
        name: 'Bilibili',
        impl: DanmakuSourceType.Bilibili,
        enabled: true,
        isBuiltIn: true,
        options: { danmakuTypePreference: 'protobuf' },
      },
    ]
    const flat = migrateProviderConfigsToFlat(legacy)
    expect(flat).toHaveLength(1)
    expect(flat[0].manifestId).toBe('bilibili')
    expect(flat[0].configValues).toEqual({ danmakuFormat: 'protobuf' })
  })

  it('skips non-object entries without crashing', () => {
    const legacy = [
      null,
      undefined,
      'a string somehow',
      42,
      {
        id: 'builtin:dandanplay',
        type: 'DanDanPlay',
        name: 'DanDanPlay',
        impl: DanmakuSourceType.DanDanPlay,
        enabled: true,
        isBuiltIn: true,
        options: {},
      },
    ]
    const flat = migrateProviderConfigsToFlat(legacy as unknown[] as never)
    expect(flat).toHaveLength(1)
    expect(flat[0].id).toBe('builtin:dandanplay')
  })

  it('recovers a partially-flat record with null configValues via the legacy path', () => {
    const legacy = [
      {
        id: 'builtin:tencent',
        manifestId: 'builtin:tencent',
        impl: DanmakuSourceType.Tencent,
        name: 'Tencent',
        enabled: true,
        isBuiltIn: true,
        configValues: null,
      },
    ]
    const flat = migrateProviderConfigsToFlat(legacy)
    expect(flat).toHaveLength(1)
    expect(flat[0].manifestId).toBe('tencent')
    expect(flat[0].configValues).toEqual({})
  })

  it('returns empty array if data is not an array', () => {
    expect(migrateProviderConfigsToFlat(null as unknown as never[])).toEqual([])
    expect(
      migrateProviderConfigsToFlat({ foo: 'bar' } as unknown as never[])
    ).toEqual([])
  })

  it('drops corrupted records with unknown type', () => {
    const legacy = [
      {
        id: 'builtin:dandanplay',
        type: 'DanDanPlay',
        name: 'DanDanPlay',
        impl: DanmakuSourceType.DanDanPlay,
        enabled: true,
        isBuiltIn: true,
        options: { chConvert: DanDanChConvert.None },
      },
      // corrupted record with no manifestId and unknown type
      {
        id: 'garbage',
        type: 'SomethingUnknown',
        name: 'Garbage',
        enabled: true,
      },
    ]

    const flat = migrateProviderConfigsToFlat(legacy)

    // Corrupted record dropped, valid record preserved
    expect(flat).toHaveLength(1)
    expect(flat[0].id).toBe('builtin:dandanplay')
  })
})

describe('migrateBuiltinPrefixedProviderIds', () => {
  const builtin = (slug: string) => ({
    id: `builtin:${slug}`,
    manifestId: `builtin:${slug}`,
    name: slug,
    impl: DanmakuSourceType.Bilibili,
    enabled: true,
    isBuiltIn: true,
    configValues: {},
  })

  it('strips the builtin: prefix from id and manifestId', () => {
    const out = migrateBuiltinPrefixedProviderIds([
      builtin('dandanplay'),
      builtin('bilibili'),
      builtin('tencent'),
    ])

    expect(out.map((c) => c.id)).toEqual(['dandanplay', 'bilibili', 'tencent'])
    expect(out.map((c) => c.manifestId)).toEqual([
      'dandanplay',
      'bilibili',
      'tencent',
    ])
  })

  it('leaves legacy:maccms untouched', () => {
    const maccms = {
      id: 'legacy:maccms',
      manifestId: 'legacy:maccms',
      name: 'MacCMS',
      impl: DanmakuSourceType.MacCMS,
      enabled: true,
      isBuiltIn: false,
      configValues: {},
    }

    const out = migrateBuiltinPrefixedProviderIds([maccms])

    expect(out).toEqual([maccms])
  })

  it('strips manifestId but keeps a custom uuid id for a custom DDP server', () => {
    const custom = {
      id: '7f3a-uuid',
      manifestId: 'builtin:dandanplay',
      name: 'My DDP',
      impl: DanmakuSourceType.DanDanPlay,
      enabled: true,
      isBuiltIn: false,
      configValues: { baseUrl: 'https://my.ddp' },
    }

    const out = migrateBuiltinPrefixedProviderIds([custom])

    expect(out[0].id).toBe('7f3a-uuid')
    expect(out[0].manifestId).toBe('dandanplay')
    expect(out[0].configValues.baseUrl).toBe('https://my.ddp')
  })

  it('is idempotent on already-bare ids', () => {
    const bare = [
      {
        id: 'bilibili',
        manifestId: 'bilibili',
        name: 'Bilibili',
        impl: DanmakuSourceType.Bilibili,
        enabled: false,
        isBuiltIn: true,
        configValues: { danmakuFormat: 'xml' },
      },
    ]

    expect(migrateBuiltinPrefixedProviderIds(bare)).toEqual(bare)
  })

  it('de-duplicates by id keeping the first occurrence', () => {
    const userBuiltin = {
      ...builtin('bilibili'),
      enabled: false,
      configValues: { danmakuFormat: 'protobuf' },
    }
    const appendedDefault = {
      id: 'bilibili',
      manifestId: 'bilibili',
      name: 'Bilibili',
      impl: DanmakuSourceType.Bilibili,
      enabled: true,
      isBuiltIn: true,
      configValues: { danmakuFormat: 'xml' },
    }

    const out = migrateBuiltinPrefixedProviderIds([
      userBuiltin,
      appendedDefault,
    ])

    expect(out).toHaveLength(1)
    // User's own record (with their settings) wins over the appended default.
    expect(out[0].enabled).toBe(false)
    expect(out[0].configValues.danmakuFormat).toBe('protobuf')
  })

  it('preserves order and unrelated fields', () => {
    const out = migrateBuiltinPrefixedProviderIds([
      builtin('tencent'),
      { ...builtin('dandanplay'), enabled: false },
    ])

    expect(out.map((c) => c.id)).toEqual(['tencent', 'dandanplay'])
    expect(out[1].enabled).toBe(false)
  })

  it('merges configValues keys the kept record lacks from the dropped duplicate', () => {
    const userBuiltin = {
      ...builtin('bilibili'),
      enabled: false,
      configValues: {},
    }
    const appendedDefault = {
      ...builtin('bilibili'),
      configValues: { danmakuFormat: 'xml' },
    }

    const out = migrateBuiltinPrefixedProviderIds([
      userBuiltin,
      appendedDefault,
    ])

    expect(out).toHaveLength(1)
    expect(out[0].enabled).toBe(false)
    // The pinned default format is preserved rather than silently dropped.
    expect(out[0].configValues.danmakuFormat).toBe('xml')
  })

  it('skips corrupt records without aborting the whole migration', () => {
    const out = migrateBuiltinPrefixedProviderIds([
      null as never,
      { manifestId: 'builtin:bilibili' } as never, // missing id
      'a string' as never,
      builtin('tencent'),
    ])

    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('tencent')
  })

  it('leaves a non-string manifestId intact instead of throwing', () => {
    const out = migrateBuiltinPrefixedProviderIds([
      { ...builtin('tencent'), manifestId: undefined as never },
    ])

    expect(out[0].id).toBe('tencent')
    expect(out[0].manifestId).toBeUndefined()
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
        impl: DanmakuSourceType.DanDanPlay,
        enabled: true,
        isBuiltIn: false,
        configValues: {},
      },
    ])
    expect(out[0].configValues.baseUrl).toBeUndefined()
  })
})
