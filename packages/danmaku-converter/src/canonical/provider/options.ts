import { z } from 'zod'
import { DanDanChConvert } from '../../utils/index.js'

export const zDanDanPlayProviderOptions = z.object({
  authToken: z.string().trim().optional(),
  baseUrl: z.string().trim().url().optional(),
  chConvert: z.nativeEnum(DanDanChConvert).optional(),
})

export type DanDanDanPlayProviderOptions = z.infer<
  typeof zDanDanPlayProviderOptions
>

export const zBilibiliProviderOptions = z.object({
  danmakuTypePreference: z.enum(['xml', 'protobuf']),
})

export type BilibiliProviderOptions = z.infer<typeof zBilibiliProviderOptions>

export const zMacCMSProviderOptions = z.object({
  danmakuBaseUrl: z
    .string()
    .url()
    .transform((val) => val.replace(/\/$/, '')), // drop trailing slash
  danmuicuBaseUrl: z
    .string()
    .url()
    .transform((val) => val.replace(/\/$/, '')), // drop trailing slash
  stripColor: z.boolean(),
})

export type MacCMSProviderOptions = z.infer<typeof zMacCMSProviderOptions>
