import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { z } from 'zod'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import { importCommentSchema } from '@/common/danmaku/models/import/commentSchema'

const baseSchemaV2 = z.object({
  provider: z.nativeEnum(DanmakuSourceType),
  comments: z.array(importCommentSchema),
  commentCount: z.number(),
  version: z.number(),
  timeUpdated: z.number(),
  schemaVersion: z.literal(2),
})

export const v2 = {
  dandanPlay: z.discriminatedUnion('provider', [
    baseSchemaV2.extend({
      provider: z.literal(DanmakuSourceType.DDP),
      params: z.object({
        chConvert: z.nativeEnum(DanDanChConvert).optional(),
        withRelated: z.boolean().optional(),
        from: z.number().optional(),
      }),
      meta: z.object({
        provider: z.literal(DanmakuSourceType.DDP),
        episodeId: z.number(),
        seasonId: z.number(),
        episodeTitle: z.string().optional(),
        seasonTitle: z.string(),
      }),
    }),
  ]),
  custom: z.discriminatedUnion('provider', [
    baseSchemaV2.extend({
      provider: z.literal(DanmakuSourceType.Custom),
      meta: z
        .object({
          provider: z.literal(DanmakuSourceType.Custom),
          seasonTitle: z.string(),
          episodeTitle: z.string().optional(),
          episodeNumber: z.number().optional(),
        })
        .refine((data) => {
          return (
            data.episodeTitle !== undefined || data.episodeNumber !== undefined
          )
        }, 'One of episodeTitle or episodeNumber is required'),
    }),
  ]),
}

export const importSchemaV2 = z.discriminatedUnion('provider', [
  ...v2.dandanPlay.options,
  ...v2.custom.options,
])
