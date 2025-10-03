import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { z } from 'zod'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { Options } from '@/common/options/OptionsService/types'
import { getRandomUUID } from '@/common/utils/utils'

export const zProviderConfigType = z.enum([
  'DanDanPlay',
  'Bilibili',
  'Tencent',
  'DanDanPlayCompatible',
  'MacCMS',
])

const zProviderConfigBase = z.object({
  id: z.string().uuid().default(getRandomUUID()),
  type: zProviderConfigType,
  name: z.string().min(1),
  isBuiltIn: z.boolean(),
  enabled: z.boolean(),
})

export const zDanDanPlayProviderConfig = zProviderConfigBase.extend({
  id: z.literal('dandanplay'),
  type: z.literal('DanDanPlay'),
  name: z.literal('DanDanPlay'),
  isBuiltIn: z.literal(true),
  options: z.object({
    baseUrl: z.string().trim().url().optional(),
    apiKey: z.string().optional(),
    chConvert: z.nativeEnum(DanDanChConvert),
  }),
})

export const zBilibiliProviderConfig = zProviderConfigBase.extend({
  id: z.literal('bilibili'),
  type: z.literal('Bilibili'),
  name: z.literal('Bilibili'),
  isBuiltIn: z.literal(true),
  options: z.object({
    danmakuTypePreference: z.enum(['xml', 'protobuf']).default('xml'),
    protobufLimitPerMin: z.number().int().positive().max(1000).default(200),
  }),
})

export const zTencentProviderConfig = zProviderConfigBase.extend({
  id: z.literal('tencent'),
  type: z.literal('Tencent'),
  name: z.literal('Tencent'),
  isBuiltIn: z.literal(true),
  options: z.object({
    limitPerMin: z.number().int().positive().max(1000).default(200),
  }),
})

export const zDanDanPlayCompatibleProviderConfig = zProviderConfigBase.extend({
  type: z.literal('DanDanPlayCompatible'),
  isBuiltIn: z.literal(false),
  options: z.object({
    baseUrl: z.string().trim().url(),
    chConvert: z.nativeEnum(DanDanChConvert),
  }),
})

export const zMacCmsProviderConfig = zProviderConfigBase.extend({
  type: z.literal('MacCMS'),
  isBuiltIn: z.literal(false),
  options: z.object({
    danmakuBaseUrl: z
      .string()
      .url()
      .transform((val) => val.replace(/\/$/, '')),
    danmuicuBaseUrl: z
      .string()
      .url()
      .transform((val) => val.replace(/\/$/, '')),
    stripColor: z.boolean(),
  }),
})

export const providerConfigSchema = z.discriminatedUnion('type', [
  zDanDanPlayProviderConfig,
  zBilibiliProviderConfig,
  zTencentProviderConfig,
  zDanDanPlayCompatibleProviderConfig,
  zMacCmsProviderConfig,
])

export const providerConfigListSchema = z.array(providerConfigSchema)

export type BuiltInDanDanPlayProvider = z.infer<
  typeof zDanDanPlayProviderConfig
>
export type BuiltInBilibiliProvider = z.infer<typeof zBilibiliProviderConfig>
export type BuiltInTencentProvider = z.infer<typeof zTencentProviderConfig>
export type CustomDanDanPlayProvider = z.infer<
  typeof zDanDanPlayCompatibleProviderConfig
>
export type CustomMacCmsProvider = z.infer<typeof zMacCmsProviderConfig>

export type ProviderConfig = z.infer<typeof providerConfigSchema>
export type ProviderConfigInput = z.input<typeof providerConfigSchema>

export type ProviderConfigOptions = Options<ProviderConfig[]>

export type BuiltInProvider =
  | BuiltInDanDanPlayProvider
  | BuiltInBilibiliProvider
  | BuiltInTencentProvider

export type CustomProvider = CustomDanDanPlayProvider | CustomMacCmsProvider

export type ProviderByType<T extends ProviderConfig['type']> = Extract<
  ProviderConfig,
  { type: T }
>

export const providerTypeToDanmakuSource = {
  'builtin-dandanplay': DanmakuSourceType.DanDanPlay,
  'custom-dandanplay': DanmakuSourceType.DanDanPlay,
  'builtin-bilibili': DanmakuSourceType.Bilibili,
  'builtin-tencent': DanmakuSourceType.Tencent,
  'custom-maccms': DanmakuSourceType.Custom,
} as const
