import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { produce } from 'immer'
import { Logger } from '@/common/Logger'
import { Language } from '@/common/localization/language'
import { defaultExtensionOptions } from '@/common/options/extensionOptions/constant'
import { defaultKeymap } from '@/common/options/extensionOptions/hotkeys'
import type { ExtensionOptions } from '@/common/options/extensionOptions/schema'
import type { PrevOptions } from '@/common/options/OptionsService/OptionsService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { migrateDanmakuSourcesToProviders } from '@/common/options/providerConfig/migration'
import { providerConfigService } from '@/common/options/providerConfig/service'
import { ColorMode } from '@/common/theme/enums'

export const extensionOptionsService = new OptionsService(
  'extensionOptions',
  defaultExtensionOptions
)
  .version(1, {
    upgrade: (data: PrevOptions) => data,
  })
  .version(2, {
    upgrade: (data: PrevOptions) => {
      return {
        ...data,
        lang: Language.zh, // add lang field
      }
    },
  })
  .version(3, {
    upgrade: (data: PrevOptions) => {
      return {
        ...data,
        danmakuSources: {
          dandanplay: {
            baseUrl: 'https://api.dandanplay.net', // add danmakuSource with baseUrl field
          },
        },
      }
    },
  })
  .version(4, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        if (draft.danmakuSources) {
          // Add option to convert between simplified and traditional Chinese
          draft.danmakuSources.dandanplay.chConvert = DanDanChConvert.None
        }
      }),
  })
  .version(5, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add theme options
        draft.theme = {
          colorMode: ColorMode.System,
        }
      }),
  })
  .version(6, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        if (draft.danmakuSources) {
          // Add bilibili danmaku source and disable it by default
          draft.danmakuSources.dandanplay.enabled = true
          draft.danmakuSources.bilibili = {
            enabled: false,
            // biome-ignore lint/suspicious/noExplicitAny: deprecated field
          } as any
        }
      }),
  })
  .version(7, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add bilibili danmaku source options
        if (draft.danmakuSources) {
          draft.danmakuSources.bilibili.danmakuTypePreference = 'xml'
          draft.danmakuSources.bilibili.protobufLimitPerMin = 200
        }
      }),
  })
  .version(8, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add tencent and iqiyi danmaku source options
        if (draft.danmakuSources) {
          draft.danmakuSources.tencent = {
            enabled: false,
            limitPerMin: 200,
          }
          draft.danmakuSources.iqiyi = {
            enabled: false,
            limitPerMin: 200,
          }
        }
      }),
  })
  .version(9, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add hotkeys
        draft.hotkeys = defaultKeymap
      }),
  })
  .version(10, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add showReleaseNotes field
        draft.showReleaseNotes = false
      }),
  })
  .version(11, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add searchUsingSimplified field
        draft.searchUsingSimplified = false
      }),
  })
  .version(12, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add debug field
        draft.debug = false
      }),
  })
  .version(13, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        draft.retentionPolicy = {
          enabled: false,
          deleteCommentsAfter: 30,
        }
      }),
  })
  .version(14, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add analytics field
        draft.enableAnalytics = true
      }),
  })
  .version(15, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add playerOptions field
        draft.playerOptions = {
          showSkipButton: true,
          showDanmakuTimeline: true,
        }
      }),
  })
  .version(16, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        if (draft.danmakuSources) {
          // Add custom danmaku source
          draft.danmakuSources.custom = {
            enabled: true,
            baseUrl: 'https://zy.xmm.hk',
            danmuicuBaseUrl: 'https://api.danmu.icu',
            stripColor: true,
          }
        }
      }),
  })
  .version(17, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add matchLocalDanmaku
        draft.matchLocalDanmaku = true
      }),
  })
  .version(18, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add stripColor
        if (draft.danmakuSources) {
          draft.danmakuSources.custom.stripColor = true
        }
      }),
  })
  .version(19, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add danmuicuBaseUrl
        if (draft.danmakuSources) {
          draft.danmakuSources.custom.danmuicuBaseUrl = 'https://api.danmu.icu'
        }
      }),
  })
  .version(20, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        if (draft.danmakuSources) {
          draft.danmakuSources.dandanplay.useCustomRoot = false
          draft.danmakuSources.dandanplay.baseUrl = ''
        }
      }),
  })
  .version(21, {
    upgrade: (data: PrevOptions) => {
      if (data.danmakuSources) {
        const providers = migrateDanmakuSourcesToProviders(data.danmakuSources)

        // set data in separate storage
        try {
          void providerConfigService.options.set(providers)
        } catch (error) {
          Logger.error(
            'Failed to migrate provider configs from extension service to provider service'
          )
          Logger.error(error)
        }

        // biome-ignore lint/correctness/noUnusedVariables: drop deprecated fields
        const { danmakuSources, ...rest } = data
        return rest
      }
      return data
    },
  })
