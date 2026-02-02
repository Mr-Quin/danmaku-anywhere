import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { z } from 'zod'

import { Language } from '@/common/localization/language'
import type { Options } from '@/common/options/OptionsService/types'
import { ColorMode } from '@/common/theme/enums'

/**
 * @deprecated Migrated to separate provider config storage in version 21
 */
export const danmakuSourcesSchema = z.object({
  dandanplay: z.object({
    enabled: z.boolean(),
    baseUrl: z.string().trim(),
    useCustomRoot: z.boolean(),
    chConvert: z.enum(DanDanChConvert),
  }),
  bilibili: z.object({
    enabled: z.boolean(),
    danmakuTypePreference: z.enum(['xml', 'protobuf']).default('xml'),
    /**
     * @deprecated
     * Deprecated in favor of danmakuOptions.limitPerSec
     */
    protobufLimitPerMin: z.int().positive().max(1000).default(200),
  }),
  tencent: z.object({
    enabled: z.boolean(),
    /**
     * @deprecated
     * Deprecated in favor of danmakuOptions.limitPerSec
     */
    limitPerMin: z.int().positive().max(1000).default(200),
  }),
  iqiyi: z.object({
    enabled: z.boolean(),
    /**
     * @deprecated
     * Deprecated in favor of danmakuOptions.limitPerSec
     */
    limitPerMin: z.int().positive().max(1000).default(200),
  }),
  custom: z.object({
    enabled: z.boolean(),
    baseUrl: z.url().transform((val) => val.replace(/\/$/, '')),
    danmuicuBaseUrl: z.url().transform((val) => val.replace(/\/$/, '')),
    stripColor: z.boolean(),
  }),
})

export const playerOptionsSchema = z.object({
  showSkipButton: z.boolean(),
  showDanmakuTimeline: z.boolean(),
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
  // TODO: the input type here should be string. it says number here to work around
  // an issue with react-hook-form
  deleteCommentsAfter: z.coerce.number<number>().int().min(0),
})

const userThemeSchema = z.object({
  colorMode: z.enum(ColorMode),
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
  lang: z.enum(Language),

  /**
   * Whether to convert traditional Chinese to simplified Chinese when searching for danmaku
   */
  searchUsingSimplified: z.boolean(),

  /**
   * @deprecated Migrated to separate provider config storage in version 21
   */
  danmakuSources: danmakuSourcesSchema.optional(),

  playerOptions: playerOptionsSchema,

  /**
   * Configuration for retention policy
   */
  retentionPolicy: retentionPolicySchema,

  matchLocalDanmaku: z.boolean(),

  /**
   * Configuration for the theme
   */
  theme: userThemeSchema,

  /**
   * Configuration for hotkeys
   */
  hotkeys,

  /**
   * If analytics data should be collected
   */
  enableAnalytics: z.boolean(),

  /**
   * Whether the "Release Notes" dialog should be shown
   */
  showReleaseNotes: z.boolean(),

  /**
   * Auto generated user id
   */
  id: z.string().optional(),

  /**
   * Whether to limit the modifier header to requests initiated by the extension itself
   */
  restrictInitiatorDomain: z.boolean(),
})

export type ExtensionOptions = z.infer<typeof extensionOptionsSchema>

export type DanmakuSources = z.infer<typeof danmakuSourcesSchema>

export type RetentionPolicy = z.infer<typeof retentionPolicySchema>

export type UserTheme = z.infer<typeof userThemeSchema>

export type ExtensionOptionsOptions = Options<ExtensionOptions>
