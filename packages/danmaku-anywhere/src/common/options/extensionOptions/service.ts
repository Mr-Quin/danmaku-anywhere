import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { produce } from 'immer'

import { Language } from '@/common/localization/language'
import { defaultExtensionOptions } from '@/common/options/extensionOptions/constant'
import { defaultKeymap } from '@/common/options/extensionOptions/hotkeys'
import type { ExtensionOptions } from '@/common/options/extensionOptions/schema'
import type { PrevOptions } from '@/common/options/OptionsService/OptionsService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
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
        // Add option to convert between simplified and traditional Chinese
        draft.danmakuSources.dandanplay.chConvert = DanDanChConvert.None
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
        // Add bilibili danmaku source and disable it by default
        draft.danmakuSources.dandanplay.enabled = true
        draft.danmakuSources.bilibili = {
          enabled: false,
        } as unknown as ExtensionOptions['danmakuSources']['bilibili']
      }),
  })
  .version(7, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add bilibili danmaku source options
        draft.danmakuSources.bilibili.danmakuTypePreference = 'xml'
        draft.danmakuSources.bilibili.protobufLimitPerMin = 200
      }),
  })
  .version(8, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add tencent and iqiyi danmaku source options
        draft.danmakuSources.tencent = {
          enabled: false,
          limitPerMin: 200,
        }
        draft.danmakuSources.iqiyi = {
          enabled: false,
          limitPerMin: 200,
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
        // Add custom danmaku source
        draft.danmakuSources.custom = {
          enabled: true,
          baseUrl: 'https://zy.xmm.hk',
          danmuicuBaseUrl: 'https://api.danmu.icu',
          stripColor: true,
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
        draft.danmakuSources.custom.stripColor = true
      }),
  })
  .version(19, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add danmuicuBaseUrl
        draft.danmakuSources.custom.danmuicuBaseUrl = 'https://api.danmu.icu'
      }),
  })
  .version(20, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add DanDanPlay baseUrl option
        const fallbackBaseUrl: string =
          // @ts-ignore vite import meta type may not include this field here
          (import.meta as unknown as { env?: Record<string, string> }).env
            ?.VITE_PROXY_URL ?? 'https://api.danmaku.weeblify.app'
        if (!draft.danmakuSources.dandanplay) {
          // Ensure dandanplay exists
          draft.danmakuSources.dandanplay = {
            enabled: true,
            chConvert: DanDanChConvert.None,
            baseUrl: fallbackBaseUrl,
          }
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!draft.danmakuSources.dandanplay.baseUrl) {
            draft.danmakuSources.dandanplay.baseUrl = fallbackBaseUrl
          }
        }
      }),
  })
