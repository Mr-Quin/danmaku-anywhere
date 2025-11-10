import {
  zBilibiliProviderOptions,
  zDanDanPlayProviderOptions,
  zMacCMSProviderOptions,
} from '@danmaku-anywhere/danmaku-converter'
import { z } from 'zod'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { Options } from '@/common/options/OptionsService/types'

export const zProviderConfigType = z.enum([
  'DanDanPlay',
  'Bilibili',
  'Tencent',
  'DanDanPlayCompatible',
  'MacCMS',
])

export type ProviderConfigType = z.infer<typeof zProviderConfigType>

const zProviderConfigBase = z.object({
  id: z.string(),
  type: zProviderConfigType,
  impl: z.nativeEnum(DanmakuSourceType),
  name: z.string().min(1),
  isBuiltIn: z.boolean(),
  enabled: z.boolean(),
})

export const zDanDanPlayProviderConfig = zProviderConfigBase.extend({
  id: z.literal('builtin:dandanplay'),
  type: z.literal('DanDanPlay'),
  impl: z.literal(DanmakuSourceType.DanDanPlay),
  name: z.literal('DanDanPlay'),
  isBuiltIn: z.literal(true),
  options: zDanDanPlayProviderOptions,
})

export const zBilibiliProviderConfig = zProviderConfigBase.extend({
  id: z.literal('builtin:bilibili'),
  type: z.literal('Bilibili'),
  impl: z.literal(DanmakuSourceType.Bilibili),
  name: z.literal('Bilibili'),
  isBuiltIn: z.literal(true),
  options: zBilibiliProviderOptions,
})

export const zTencentProviderConfig = zProviderConfigBase.extend({
  id: z.literal('builtin:tencent'),
  type: z.literal('Tencent'),
  impl: z.literal(DanmakuSourceType.Tencent),
  name: z.literal('Tencent'),
  isBuiltIn: z.literal(true),
  options: z.object({}),
})

export const zDanDanPlayCompatibleProviderConfig = zProviderConfigBase.extend({
  id: z.string().min(1),
  type: z.literal('DanDanPlayCompatible'),
  impl: z.literal(DanmakuSourceType.DanDanPlay),
  isBuiltIn: z.literal(false),
  options: zDanDanPlayProviderOptions,
})

export const zMacCmsProviderConfig = zProviderConfigBase.extend({
  id: z.string().min(1),
  type: z.literal('MacCMS'),
  impl: z.literal(DanmakuSourceType.MacCMS),
  isBuiltIn: z.literal(false),
  options: zMacCMSProviderOptions,
})

export const providerConfigSchema = z.discriminatedUnion('type', [
  zDanDanPlayProviderConfig,
  zBilibiliProviderConfig,
  zTencentProviderConfig,
  zDanDanPlayCompatibleProviderConfig,
  zMacCmsProviderConfig,
])

export type BuiltInDanDanPlayProvider = z.infer<
  typeof zDanDanPlayProviderConfig
>
export type BuiltInBilibiliProvider = z.infer<typeof zBilibiliProviderConfig>
export type BuiltInTencentProvider = z.infer<typeof zTencentProviderConfig>
export type DanDanPlayCompatProvider = z.infer<
  typeof zDanDanPlayCompatibleProviderConfig
>
export type CustomMacCmsProvider = z.infer<typeof zMacCmsProviderConfig>

export type ProviderConfig = z.infer<typeof providerConfigSchema>

export type ProviderConfigOptions = Options<ProviderConfig[]>
