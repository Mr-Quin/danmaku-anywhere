import { DanDanChConvert } from '@danmaku-anywhere/dandanplay-api'
import { z } from 'zod'

import { Language } from '@/common/localization/language'
import type { Options } from '@/common/options/OptionsService/types'
import { ColorMode } from '@/common/theme/enums'

export const danmakuSourcesSchema = z.object({
  dandanplay: z.object({
    baseUrl: z.string().url(),
    chConvert: z.nativeEnum(DanDanChConvert),
  }),
})

const userThemeSchema = z.object({
  colorMode: z.nativeEnum(ColorMode),
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

  /**
   * Configuration for the theme
   */
  theme: userThemeSchema,
})

export type ExtensionOptions = z.infer<typeof extensionOptionsSchema>

export type DanmakuSources = z.infer<typeof danmakuSourcesSchema>

export type UserTheme = z.infer<typeof userThemeSchema>

export type ExtensionOptionsOptions = Options<ExtensionOptions>
