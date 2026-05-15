import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { describe, expect, it } from 'vitest'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import {
  migrateDanmakuSourcesToProviders,
  migrateProviderConfigsToFlat,
} from './migration'

/**
 * Exercises both provider-config migrations:
 * - `migrateDanmakuSourcesToProviders`: pre-v21 `danmakuSources` blob →
 *   flat ProviderConfig[].
 * - `migrateProviderConfigsToFlat`: v1 discriminated-union ProviderConfig
 *   records → flat shape (idempotent on already-flat input, drops
 *   corrupted records).
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
      expect(providers[0].manifestId).toBe('builtin:dandanplay')
      expect(providers[0].impl).toBe(DanmakuSourceType.DanDanPlay)
      expect(providers[1].manifestId).toBe('builtin:bilibili')
      expect(providers[1].impl).toBe(DanmakuSourceType.Bilibili)
      expect(providers[2].manifestId).toBe('builtin:tencent')
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
      expect(ddp.id).toBe('builtin:dandanplay')
      expect(ddp.manifestId).toBe('builtin:dandanplay')
      expect(ddp.impl).toBe(DanmakuSourceType.DanDanPlay)
      expect(ddp.enabled).toBe(true)
      expect(ddp.configValues.chConvert).toBe(1)

      const bili = providers[1]
      expect(bili.id).toBe('builtin:bilibili')
      expect(bili.manifestId).toBe('builtin:bilibili')
      expect(bili.impl).toBe(DanmakuSourceType.Bilibili)
      expect(bili.enabled).toBe(true)
      expect(bili.configValues.danmakuFormat).toBe('protobuf')

      const tencent = providers[2]
      expect(tencent.id).toBe('builtin:tencent')
      expect(tencent.manifestId).toBe('builtin:tencent')
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
      expect(ddp.manifestId).toBe('builtin:dandanplay')
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

      const bilibili = providers.find(
        (p) => p.manifestId === 'builtin:bilibili'
      )
      expect(bilibili).toBeDefined()
      expect(bilibili?.enabled).toBe(true) // Default enabled

      const tencent = providers.find((p) => p.manifestId === 'builtin:tencent')
      expect(tencent).toBeDefined()
      expect(tencent?.enabled).toBe(true) // Default enabled
    })

    it('omits danmakuFormat from configValues when legacy record lacks danmakuTypePreference', () => {
      // Absent key lets the manifest's configSchema default fire instead
      // of writing a stored value that masks it.
      const oldSources = {
        bilibili: { enabled: true },
      }
      const providers = migrateDanmakuSourcesToProviders(
        oldSources as DanmakuSources
      )
      const bili = providers.find((p) => p.manifestId === 'builtin:bilibili')
      expect(bili?.configValues).toEqual({})
    })

    it('should fall back to defaults when migration fails completely', () => {
      // Pass invalid data to trigger catch block
      const providers = migrateDanmakuSourcesToProviders(
        null as unknown as DanmakuSources
      )

      expect(providers).toHaveLength(3)
      expect(providers[0].manifestId).toBe('builtin:dandanplay')
      expect(providers[1].manifestId).toBe('builtin:bilibili')
      expect(providers[2].manifestId).toBe('builtin:tencent')
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

    expect(flat[0].manifestId).toBe('builtin:dandanplay')
    expect(flat[0].configValues.chConvert).toBe(DanDanChConvert.Simplified)

    expect(flat[1].manifestId).toBe('builtin:bilibili')
    // Field renamed: danmakuTypePreference → danmakuFormat
    expect(flat[1].configValues.danmakuFormat).toBe('protobuf')

    expect(flat[2].manifestId).toBe('builtin:tencent')
    expect(flat[2].configValues).toEqual({})

    expect(flat[3].manifestId).toBe('builtin:ddp-compat')
    expect(flat[3].configValues.baseUrl).toBe('https://compat.example')

    expect(flat[4].manifestId).toBe('legacy:maccms')
    expect(flat[4].configValues.danmakuBaseUrl).toBe('https://m.example')
    expect(flat[4].configValues.stripColor).toBe(true)
  })

  it('preserves a record that is already flat (idempotent)', () => {
    const alreadyFlat = [
      {
        id: 'builtin:dandanplay',
        manifestId: 'builtin:dandanplay',
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
    expect(flat[0].manifestId).toBe('builtin:bilibili')
    // Undefined keys are stripped so the manifest's configSchema default
    // applies at run time.
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
    expect(flat[0].manifestId).toBe('builtin:bilibili')
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
    expect(flat[0].manifestId).toBe('builtin:tencent')
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
