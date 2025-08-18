import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'

import { Language } from '@/common/localization/language'
import { defaultKeymap } from '@/common/options/extensionOptions/hotkeys'
import type { ExtensionOptions } from '@/common/options/extensionOptions/schema'
import { ColorMode } from '@/common/theme/enums'

export const ChConvertList = [
  {
    label: 'optionsPage.chConvert.none',
    value: DanDanChConvert.None,
  },
  {
    label: 'optionsPage.chConvert.simplified',
    value: DanDanChConvert.Simplified,
  },
  {
    label: 'optionsPage.chConvert.traditional',
    value: DanDanChConvert.Traditional,
  },
] as const

export const defaultExtensionOptions: ExtensionOptions = {
  enabled: true,
  debug: false,
  lang: Language.zh,
  searchUsingSimplified: false,
  retentionPolicy: {
    enabled: false,
    deleteCommentsAfter: 30,
  },
  danmakuSources: {
    dandanplay: {
      enabled: true,
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
      enabled: true,
      baseUrl: 'https://zy.xmm.hk',
    },
  },
  playerOptions: {
    showSkipButton: true,
    showDanmakuTimeline: true,
  },
  theme: {
    colorMode: ColorMode.System,
  },
  matchLocalDanmaku: true,
  hotkeys: defaultKeymap,
  showReleaseNotes: false,
  enableAnalytics: true,
  id: undefined,
} as const
