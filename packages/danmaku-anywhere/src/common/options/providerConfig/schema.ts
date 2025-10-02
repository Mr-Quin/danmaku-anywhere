import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { z } from 'zod'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { Options } from '@/common/options/OptionsService/types'
import { getRandomUUID } from '@/common/utils/utils'

/**
 * Built-in DanDanPlay provider
 * Cannot be removed, only disabled
 */
export const builtInDanDanPlayProviderSchema = z.object({
  id: z.literal('builtin-dandanplay'),
  type: z.literal('builtin-dandanplay' as const),
  name: z.literal('DanDanPlay'),
  enabled: z.boolean(),
  options: z.object({
    chConvert: z.nativeEnum(DanDanChConvert),
  }),
})

/**
 * Built-in Bilibili provider
 * Cannot be removed, only disabled
 */
export const builtInBilibiliProviderSchema = z.object({
  id: z.literal('builtin-bilibili'),
  type: z.literal('builtin-bilibili' as const),
  name: z.literal('Bilibili'),
  enabled: z.boolean(),
  options: z.object({
    danmakuTypePreference: z.enum(['xml', 'protobuf']).default('xml'),
    protobufLimitPerMin: z.number().int().positive().max(1000).default(200),
  }),
})

/**
 * Built-in Tencent provider
 * Cannot be removed, only disabled
 */
export const builtInTencentProviderSchema = z.object({
  id: z.literal('builtin-tencent'),
  type: z.literal('builtin-tencent' as const),
  name: z.literal('Tencent'),
  enabled: z.boolean(),
  options: z.object({
    limitPerMin: z.number().int().positive().max(1000).default(200),
  }),
})

/**
 * Custom DanDanPlay-Compatible provider
 * Can be added/removed by user
 */
export const customDanDanPlayProviderSchema = z.object({
  id: z.string().uuid().default(getRandomUUID()),
  type: z.literal('custom-dandanplay' as const),
  name: z.string().min(1),
  enabled: z.boolean(),
  options: z.object({
    baseUrl: z.string().trim().url(),
    chConvert: z.nativeEnum(DanDanChConvert),
  }),
})

/**
 * Custom MacCMS provider
 * Can be added/removed by user
 */
export const customMacCmsProviderSchema = z.object({
  id: z.string().uuid().default(getRandomUUID()),
  type: z.literal('custom-maccms' as const),
  name: z.string().min(1),
  enabled: z.boolean(),
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
  builtInDanDanPlayProviderSchema,
  builtInBilibiliProviderSchema,
  builtInTencentProviderSchema,
  customDanDanPlayProviderSchema,
  customMacCmsProviderSchema,
])

export const providerConfigListSchema = z.array(providerConfigSchema)

export type BuiltInDanDanPlayProvider = z.infer<
  typeof builtInDanDanPlayProviderSchema
>
export type BuiltInBilibiliProvider = z.infer<
  typeof builtInBilibiliProviderSchema
>
export type BuiltInTencentProvider = z.infer<
  typeof builtInTencentProviderSchema
>
export type CustomDanDanPlayProvider = z.infer<
  typeof customDanDanPlayProviderSchema
>
export type CustomMacCmsProvider = z.infer<typeof customMacCmsProviderSchema>

export type ProviderConfig = z.infer<typeof providerConfigSchema>
export type ProviderConfigInput = z.input<typeof providerConfigSchema>

export type ProviderConfigOptions = Options<ProviderConfig[]>

export type BuiltInProvider =
  | BuiltInDanDanPlayProvider
  | BuiltInBilibiliProvider
  | BuiltInTencentProvider

export type CustomProvider = CustomDanDanPlayProvider | CustomMacCmsProvider

// Helper type to get provider by type
export type ProviderByType<T extends ProviderConfig['type']> = Extract<
  ProviderConfig,
  { type: T }
>

// Map provider types to DanmakuSourceType
export const providerTypeToDanmakuSource = {
  'builtin-dandanplay': DanmakuSourceType.DanDanPlay,
  'custom-dandanplay': DanmakuSourceType.DanDanPlay,
  'builtin-bilibili': DanmakuSourceType.Bilibili,
  'builtin-tencent': DanmakuSourceType.Tencent,
  'custom-maccms': DanmakuSourceType.Custom,
} as const
