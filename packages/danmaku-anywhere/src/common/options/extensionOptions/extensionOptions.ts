import { DanDanChConvert } from '@danmaku-anywhere/dandanplay-api'
import { z } from 'zod'

import type { Options } from '../../services/SyncOptionsService/types'

import { Language } from '@/common/localization/language'

export const danmakuSourcesSchema = z.object({
  dandanplay: z.object({
    baseUrl: z.string().url(),
    chConvert: z.nativeEnum(DanDanChConvert),
  }),
})

export const extensionOptionsSchema = z.object({
  /**
   * Whether the extension is enabled
   * Does not affect content script registration.
   * Content script is only visually hidden when disabled
   */
  enabled: z.boolean(),

  /**
   * Language of the extension
   */
  lang: z.nativeEnum(Language),

  /**
   * Configuration for individual danmaku sources
   */
  danmakuSources: danmakuSourcesSchema,
})

export type ExtensionOptions = z.infer<typeof extensionOptionsSchema>

export type DanmakuSources = z.infer<typeof danmakuSourcesSchema>

export type ExtensionOptionsOptions = Options<ExtensionOptions>

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
]

export const defaultExtensionOptions: ExtensionOptions = {
  enabled: true,
  lang: Language.zh,
  danmakuSources: {
    dandanplay: {
      baseUrl: 'https://api.dandanplay.net',
      chConvert: DanDanChConvert.None,
    },
  },
}
