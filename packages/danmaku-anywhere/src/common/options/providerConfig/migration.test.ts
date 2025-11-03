import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { describe, expect, it } from 'vitest'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { migrateDanmakuSourcesToProviders } from './migration'
import type {
  BuiltInBilibiliProvider,
  BuiltInDanDanPlayProvider,
  BuiltInTencentProvider,
  CustomMacCmsProvider,
} from './schema'

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
      expect(providers[0].type).toBe('DanDanPlay')
      expect(providers[0].impl).toBe(DanmakuSourceType.DanDanPlay)
      expect(providers[1].type).toBe('Bilibili')
      expect(providers[1].impl).toBe(DanmakuSourceType.Bilibili)
      expect(providers[2].type).toBe('Tencent')
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

      // Check DanDanPlay built-in
      const ddp = providers[0] as BuiltInDanDanPlayProvider
      expect(ddp.id).toBe('dandanplay')
      expect(ddp.type).toBe('DanDanPlay')
      expect(ddp.impl).toBe(DanmakuSourceType.DanDanPlay)
      expect(ddp.enabled).toBe(true)
      expect(ddp.options.chConvert).toBe(1)

      // Check Bilibili built-in
      const bili = providers[1] as BuiltInBilibiliProvider
      expect(bili.id).toBe('bilibili')
      expect(bili.type).toBe('Bilibili')
      expect(bili.impl).toBe(DanmakuSourceType.Bilibili)
      expect(bili.enabled).toBe(true)
      expect(bili.options.danmakuTypePreference).toBe('protobuf')

      // Check Tencent built-in
      const tencent = providers[2] as BuiltInTencentProvider
      expect(tencent.id).toBe('tencent')
      expect(tencent.type).toBe('Tencent')
      expect(tencent.impl).toBe(DanmakuSourceType.Tencent)
      expect(tencent.enabled).toBe(true)

      // Check custom MacCMS
      const maccms = providers[3] as CustomMacCmsProvider
      expect(maccms.type).toBe('MacCMS')
      expect(maccms.impl).toBe(DanmakuSourceType.MacCMS)
      expect(maccms.name).toBe('MacCMS (Migrated)')
      expect(maccms.enabled).toBe(true)
      expect(maccms.options.danmakuBaseUrl).toBe('https://vs.okcdn100.top')
      expect(maccms.options.danmuicuBaseUrl).toBe('https://danmu.56uxi.com')
      expect(maccms.options.stripColor).toBe(true)
      expect(maccms.id).toBeTruthy() // Should have a UUID
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

      // Should have 3 built-in providers
      expect(providers).toHaveLength(3)

      // Check DanDanPlay chConvert is preserved
      const ddp = providers[0] as BuiltInDanDanPlayProvider
      expect(ddp.type).toBe('DanDanPlay')
      expect(ddp.options.chConvert).toBe(DanDanChConvert.Simplified)
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

      const maccms = providers[3] as CustomMacCmsProvider
      expect(maccms.type).toBe('MacCMS')
      expect(maccms.impl).toBe(DanmakuSourceType.MacCMS)
      expect(maccms.name).toBe('MacCMS (Migrated)')
      expect(maccms.enabled).toBe(true)
      expect(maccms.options.danmakuBaseUrl).toBe('https://maccms.example.com')
      expect(maccms.options.danmuicuBaseUrl).toBe('https://danmu.example.com')
      expect(maccms.options.stripColor).toBe(true)
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
      expect(providers.find((p) => p.type === 'MacCMS')).toBeUndefined()
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
      expect(providers.find((p) => p.type === 'MacCMS')).toBeUndefined()
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

      const bilibili = providers.find((p) => p.type === 'Bilibili')
      expect(bilibili).toBeDefined()
      expect(bilibili?.enabled).toBe(true) // Default enabled

      const tencent = providers.find((p) => p.type === 'Tencent')
      expect(tencent).toBeDefined()
      expect(tencent?.enabled).toBe(true) // Default enabled
    })

    it('should fall back to defaults when migration fails completely', () => {
      // Pass invalid data to trigger catch block
      const providers = migrateDanmakuSourcesToProviders(null as any)

      expect(providers).toHaveLength(3)
      expect(providers[0].type).toBe('DanDanPlay')
      expect(providers[1].type).toBe('Bilibili')
      expect(providers[2].type).toBe('Tencent')
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

      const maccms = providers.find(
        (p) => p.type === 'MacCMS'
      ) as CustomMacCmsProvider
      expect(maccms.options.danmakuBaseUrl).toBe('https://maccms.example.com')
      expect(maccms.options.danmuicuBaseUrl).toBe('https://danmu.example.com')
    })
  })
})
