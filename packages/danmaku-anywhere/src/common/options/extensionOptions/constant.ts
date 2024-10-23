import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'

import { Language } from '@/common/localization/language'
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

const createHotkey = (key: string, enabled = true) => {
  return {
    key,
    enabled,
  }
}

export const defaultHotkeys = {
  togglePip: createHotkey(''),
  toggleShowDanmaku: createHotkey('shift+b'),
}

export const defaultExtensionOptions: ExtensionOptions = {
  enabled: true,
  lang: Language.zh,
  danmakuSources: {
    dandanplay: {
      enabled: true,
      baseUrl: 'https://api.dandanplay.net',
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
  },
  theme: {
    colorMode: ColorMode.System,
  },
  hotkeys: defaultHotkeys,
} as const
