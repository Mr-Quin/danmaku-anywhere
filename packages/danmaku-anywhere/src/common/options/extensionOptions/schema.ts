import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { z } from 'zod'

import { Language } from '@/common/localization/language'
import type { Options } from '@/common/options/OptionsService/types'
import { ColorMode } from '@/common/theme/enums'

export const danmakuSourcesSchema = z.object({
  dandanplay: z.object({
    enabled: z.boolean(),
    chConvert: z.nativeEnum(DanDanChConvert),
  }),
  bilibili: z.object({
    enabled: z.boolean(),
    danmakuTypePreference: z.enum(['xml', 'protobuf']).default('xml'),
    /**
     * @deprecated
     * Deprecated in favor of danmakuOptions.limitPerSec
     */
    protobufLimitPerMin: z.number().int().positive().max(1000).default(200),
  }),
  tencent: z.object({
    enabled: z.boolean(),
    /**
     * @deprecated
     * Deprecated in favor of danmakuOptions.limitPerSec
     */
    limitPerMin: z.number().int().positive().max(1000).default(200),
  }),
  iqiyi: z.object({
    enabled: z.boolean(),
    /**
     * @deprecated
     * Deprecated in favor of danmakuOptions.limitPerSec
     */
    limitPerMin: z.number().int().positive().max(1000).default(200),
  }),
})

export const retentionPolicySchema = z.object({
  /**
   * Enable retention policy
   */
  enabled: z.boolean(),
  /**
   * Comments older than this number of days will be deleted
   * 0 will disable this feature
   */
  deleteCommentsAfter: z.coerce.number().int().min(0),
})

const userThemeSchema = z.object({
  colorMode: z.nativeEnum(ColorMode),
})

const hotkeySchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
})

export type Hotkey = z.infer<typeof hotkeySchema>

const hotkeys = z.record(z.string(), hotkeySchema)

export const extensionOptionsSchema = z.object({
  /**
   * Whether the extension is enabled
   * Does not affect content script registration.
   * Content script is only visually hidden when disabled
   */
  enabled: z.boolean(),

  /**
   * Whether to show debug information
   */
  debug: z.boolean(),

  /**
   * Language of the extension
   */
  lang: z.nativeEnum(Language),

  /**
   * Whether to convert traditional Chinese to simplified Chinese when searching for danmaku
   */
  searchUsingSimplified: z.boolean(),

  /**
   * Configuration for individual danmaku sources
   */
  danmakuSources: danmakuSourcesSchema,

  /**
   * Configuration for retention policy
   */
  retentionPolicy: retentionPolicySchema,

  /**
   * Configuration for the theme
   */
  theme: userThemeSchema,

  /**
   * Configuration for hotkeys
   */
  hotkeys,

  /**
   * Whether the "Release Notes" dialog should be shown
   */
  showReleaseNotes: z.boolean(),
})

export type ExtensionOptions = z.infer<typeof extensionOptionsSchema>

export type DanmakuSources = z.infer<typeof danmakuSourcesSchema>

export type RetentionPolicy = z.infer<typeof retentionPolicySchema>

export type UserTheme = z.infer<typeof userThemeSchema>

export type ExtensionOptionsOptions = Options<ExtensionOptions>
