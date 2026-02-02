import { z } from 'zod'
import { DanDanChConvert } from '../../utils/index.js'

export const zDanDanPlayProviderOptions = z.object({
  baseUrl: z.url().trim().optional(),
  chConvert: z.enum(DanDanChConvert).optional(),
  auth: z
    .object({
      enabled: z.boolean(),
      headers: z.array(
        z.object({
          key: z.string().trim().min(1),
          value: z.string().trim().min(1),
        })
      ),
    })
    .optional(),
})

export type DanDanDanPlayProviderOptions = z.infer<
  typeof zDanDanPlayProviderOptions
>

export const zBilibiliProviderOptions = z.object({
  danmakuTypePreference: z.enum(['xml', 'protobuf']),
})

export type BilibiliProviderOptions = z.infer<typeof zBilibiliProviderOptions>

export const zMacCMSProviderOptions = z.object({
  danmakuBaseUrl: z.url().transform((val) => val.replace(/\/$/, '')), // drop trailing slash
  danmuicuBaseUrl: z.url().transform((val) => val.replace(/\/$/, '')), // drop trailing slash
  stripColor: z.boolean(),
})

export type MacCMSProviderOptions = z.infer<typeof zMacCMSProviderOptions>
