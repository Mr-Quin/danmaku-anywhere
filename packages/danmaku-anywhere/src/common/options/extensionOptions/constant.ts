import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider'

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

export const defaultExtensionOptions: ExtensionOptions = {
  enabled: true,
  lang: Language.zh,
  danmakuSources: {
    dandanplay: {
      baseUrl: 'https://api.dandanplay.net',
      chConvert: DanDanChConvert.None,
    },
  },
  theme: {
    colorMode: ColorMode.System,
  },
} as const
