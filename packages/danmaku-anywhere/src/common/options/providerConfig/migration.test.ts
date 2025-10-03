import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { describe, expect, it } from 'vitest'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { migrateDanmakuSourcesToProviders, needsMigration } from './migration'
import type {
  BuiltInBilibiliProvider,
  BuiltInDanDanPlayProvider,
  BuiltInTencentProvider,
  CustomDanDanPlayProvider,
  CustomMacCmsProvider,
  ProviderConfig,
} from './schema'

describe('migrateDanmakuSourcesToProviders', () => {
  describe('basic migration', () => {
    it('should migrate all built-in providers with default settings', () => {
      const oldSources: DanmakuSources = {
        dandanplay: {
          enabled: true,
          baseUrl: '',
          useCustomRoot: false,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
          protobufLimitPerMin: 200,
        },
        tencent: {
          enabled: true,
          limitPerMin: 200,
        },
        iqiyi: {
          enabled: false,
          limitPerMin: 200,
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
      expect(providers[0].type).toBe('builtin-dandanplay')
      expect(providers[1].type).toBe('builtin-bilibili')
      expect(providers[2].type).toBe('builtin-tencent')
    })

    it('should migrate with the sample data structure from user', () => {
      const oldSources: DanmakuSources = {
        dandanplay: {
          enabled: true,
          baseUrl: 'https://api.dandanplay.net/api',
          useCustomRoot: false,
          chConvert: 1,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'protobuf',
          protobufLimitPerMin: 200,
        },
        tencent: {
          enabled: true,
          limitPerMin: 200,
        },
        iqiyi: {
          enabled: false,
          limitPerMin: 200,
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

      // Check DanDanPlay built-in
      const ddp = providers[0] as BuiltInDanDanPlayProvider
      expect(ddp.id).toBe('builtin-dandanplay')
      expect(ddp.type).toBe('builtin-dandanplay')
      expect(ddp.enabled).toBe(true)
      expect(ddp.options.chConvert).toBe(1)

      // Check Bilibili built-in
      const bili = providers[1] as BuiltInBilibiliProvider
      expect(bili.id).toBe('builtin-bilibili')
      expect(bili.type).toBe('builtin-bilibili')
      expect(bili.enabled).toBe(true)
      expect(bili.options.danmakuTypePreference).toBe('protobuf')
      expect(bili.options.protobufLimitPerMin).toBe(200)

      // Check Tencent built-in
      const tencent = providers[2] as BuiltInTencentProvider
      expect(tencent.id).toBe('builtin-tencent')
      expect(tencent.type).toBe('builtin-tencent')
      expect(tencent.enabled).toBe(true)
      expect(tencent.options.limitPerMin).toBe(200)

      // Check custom MacCMS
      const maccms = providers[3] as CustomMacCmsProvider
      expect(maccms.type).toBe('custom-maccms')
      expect(maccms.name).toBe('MacCMS (Migrated)')
      expect(maccms.enabled).toBe(true)
      expect(maccms.options.danmakuBaseUrl).toBe('https://vs.okcdn100.top')
      expect(maccms.options.danmuicuBaseUrl).toBe('https://danmu.56uxi.com')
      expect(maccms.options.stripColor).toBe(true)
      expect(maccms.id).toBeTruthy() // Should have a UUID
    })
  })

  describe('custom DanDanPlay provider migration', () => {
    it('should create custom-dandanplay provider when useCustomRoot is true with custom URL', () => {
      const oldSources: DanmakuSources = {
        dandanplay: {
          enabled: true,
          baseUrl: 'https://custom-ddp.example.com/api/v2',
          useCustomRoot: true,
          chConvert: DanDanChConvert.ToSimplified,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
          protobufLimitPerMin: 200,
        },
        tencent: {
          enabled: true,
          limitPerMin: 200,
        },
        iqiyi: {
          enabled: false,
          limitPerMin: 200,
        },
        custom: {
          enabled: false,
          baseUrl: '',
          danmuicuBaseUrl: '',
          stripColor: false,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      // Should have 4 providers: built-in ddp + custom ddp + bilibili + tencent
      expect(providers).toHaveLength(4)

      // Check built-in DanDanPlay
      const builtInDdp = providers[0] as BuiltInDanDanPlayProvider
      expect(builtInDdp.type).toBe('builtin-dandanplay')
      expect(builtInDdp.enabled).toBe(true)

      // Check custom DanDanPlay
      const customDdp = providers[1] as CustomDanDanPlayProvider
      expect(customDdp.type).toBe('custom-dandanplay')
      expect(customDdp.name).toBe('DanDanPlay Compatible (Migrated)')
      expect(customDdp.enabled).toBe(true)
      expect(customDdp.options.baseUrl).toBe(
        'https://custom-ddp.example.com/api/v2'
      )
      expect(customDdp.options.chConvert).toBe(DanDanChConvert.ToSimplified)
      expect(customDdp.id).toBeTruthy() // Should have a UUID
    })

    it('should NOT create custom-dandanplay provider when using default DanDanPlay URL', () => {
      const oldSources: DanmakuSources = {
        dandanplay: {
          enabled: true,
          baseUrl: 'https://api.dandanplay.net/api/v2',
          useCustomRoot: true,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
          protobufLimitPerMin: 200,
        },
        tencent: {
          enabled: true,
          limitPerMin: 200,
        },
        iqiyi: {
          enabled: false,
          limitPerMin: 200,
        },
        custom: {
          enabled: false,
          baseUrl: '',
          danmuicuBaseUrl: '',
          stripColor: false,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      // Should only have 3 built-in providers (no custom ddp)
      expect(providers).toHaveLength(3)
      expect(providers.every((p) => p.type.startsWith('builtin-'))).toBe(true)
    })

    it('should NOT create custom-dandanplay provider when useCustomRoot is false', () => {
      const oldSources: DanmakuSources = {
        dandanplay: {
          enabled: true,
          baseUrl: 'https://custom-ddp.example.com/api/v2',
          useCustomRoot: false, // Not using custom root
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
          protobufLimitPerMin: 200,
        },
        tencent: {
          enabled: true,
          limitPerMin: 200,
        },
        iqiyi: {
          enabled: false,
          limitPerMin: 200,
        },
        custom: {
          enabled: false,
          baseUrl: '',
          danmuicuBaseUrl: '',
          stripColor: false,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      // Should only have 3 built-in providers
      expect(providers).toHaveLength(3)
      expect(
        providers.find((p) => p.type === 'custom-dandanplay')
      ).toBeUndefined()
    })

    it('should NOT create custom-dandanplay provider when baseUrl is empty', () => {
      const oldSources: DanmakuSources = {
        dandanplay: {
          enabled: true,
          baseUrl: '',
          useCustomRoot: true,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
          protobufLimitPerMin: 200,
        },
        tencent: {
          enabled: true,
          limitPerMin: 200,
        },
        iqiyi: {
          enabled: false,
          limitPerMin: 200,
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
      expect(
        providers.find((p) => p.type === 'custom-dandanplay')
      ).toBeUndefined()
    })
  })

  describe('custom MacCMS provider migration', () => {
    it('should create custom-maccms provider when valid URLs are provided', () => {
      const oldSources: DanmakuSources = {
        dandanplay: {
          enabled: true,
          baseUrl: '',
          useCustomRoot: false,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
          protobufLimitPerMin: 200,
        },
        tencent: {
          enabled: true,
          limitPerMin: 200,
        },
        iqiyi: {
          enabled: false,
          limitPerMin: 200,
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

      const maccms = providers[3] as CustomMacCmsProvider
      expect(maccms.type).toBe('custom-maccms')
      expect(maccms.name).toBe('MacCMS (Migrated)')
      expect(maccms.enabled).toBe(true)
      expect(maccms.options.danmakuBaseUrl).toBe('https://maccms.example.com')
      expect(maccms.options.danmuicuBaseUrl).toBe('https://danmu.example.com')
      expect(maccms.options.stripColor).toBe(true)
    })

    it('should NOT create custom-maccms provider when URLs are empty', () => {
      const oldSources: DanmakuSources = {
        dandanplay: {
          enabled: true,
          baseUrl: '',
          useCustomRoot: false,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
          protobufLimitPerMin: 200,
        },
        tencent: {
          enabled: true,
          limitPerMin: 200,
        },
        iqiyi: {
          enabled: false,
          limitPerMin: 200,
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
      expect(providers.find((p) => p.type === 'custom-maccms')).toBeUndefined()
    })

    it('should NOT create custom-maccms provider when only one URL is provided', () => {
      const oldSources: DanmakuSources = {
        dandanplay: {
          enabled: true,
          baseUrl: '',
          useCustomRoot: false,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
          protobufLimitPerMin: 200,
        },
        tencent: {
          enabled: true,
          limitPerMin: 200,
        },
        iqiyi: {
          enabled: false,
          limitPerMin: 200,
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
      expect(providers.find((p) => p.type === 'custom-maccms')).toBeUndefined()
    })
  })

  describe('enabled/disabled state preservation', () => {
    it('should preserve enabled state for all providers', () => {
      const oldSources: DanmakuSources = {
        dandanplay: {
          enabled: false,
          baseUrl: '',
          useCustomRoot: false,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: false,
          danmakuTypePreference: 'xml',
          protobufLimitPerMin: 200,
        },
        tencent: {
          enabled: false,
          limitPerMin: 200,
        },
        iqiyi: {
          enabled: false,
          limitPerMin: 200,
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
      const oldSources: Partial<DanmakuSources> = {
        // Only dandanplay provided
        dandanplay: {
          enabled: true,
          baseUrl: '',
          useCustomRoot: false,
          chConvert: DanDanChConvert.None,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(
        oldSources as DanmakuSources
      )

      expect(providers).toHaveLength(3)

      const bilibili = providers.find((p) => p.type === 'builtin-bilibili')
      expect(bilibili).toBeDefined()
      expect(bilibili?.enabled).toBe(true) // Default enabled

      const tencent = providers.find((p) => p.type === 'builtin-tencent')
      expect(tencent).toBeDefined()
      expect(tencent?.enabled).toBe(true) // Default enabled
    })
  })

  describe('URL trimming', () => {
    it('should trim whitespace from URLs', () => {
      const oldSources: DanmakuSources = {
        dandanplay: {
          enabled: true,
          baseUrl: '  https://custom.example.com/api  ',
          useCustomRoot: true,
          chConvert: DanDanChConvert.None,
        },
        bilibili: {
          enabled: true,
          danmakuTypePreference: 'xml',
          protobufLimitPerMin: 200,
        },
        tencent: {
          enabled: true,
          limitPerMin: 200,
        },
        iqiyi: {
          enabled: false,
          limitPerMin: 200,
        },
        custom: {
          enabled: true,
          baseUrl: '  https://maccms.example.com  ',
          danmuicuBaseUrl: '  https://danmu.example.com  ',
          stripColor: false,
        },
      }

      const providers = migrateDanmakuSourcesToProviders(oldSources)

      const customDdp = providers.find(
        (p) => p.type === 'custom-dandanplay'
      ) as CustomDanDanPlayProvider
      expect(customDdp.options.baseUrl).toBe('https://custom.example.com/api')

      const maccms = providers.find(
        (p) => p.type === 'custom-maccms'
      ) as CustomMacCmsProvider
      expect(maccms.options.danmakuBaseUrl).toBe('https://maccms.example.com')
      expect(maccms.options.danmuicuBaseUrl).toBe('https://danmu.example.com')
    })
  })
})

describe('needsMigration', () => {
  it('should return true when danmakuSources exists', () => {
    const options = {
      danmakuSources: {
        dandanplay: { enabled: true },
      },
    }

    expect(needsMigration(options)).toBe(true)
  })

  it('should return false when danmakuSources does not exist', () => {
    const options = {
      someOtherField: true,
    }

    expect(needsMigration(options)).toBe(false)
  })

  it('should return false when options is null', () => {
    expect(needsMigration(null)).toBe(false)
  })

  it('should return false when options is undefined', () => {
    expect(needsMigration(undefined)).toBe(false)
  })

  it('should return false when danmakuSources is null', () => {
    const options = {
      danmakuSources: null,
    }

    expect(needsMigration(options)).toBe(false)
  })
})
