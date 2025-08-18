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
        } as any
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
