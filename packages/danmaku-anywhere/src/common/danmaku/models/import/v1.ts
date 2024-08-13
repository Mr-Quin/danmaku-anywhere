import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { z } from 'zod'

import { importCommentSchema } from '@/common/danmaku/models/import/commentSchema'

const baseSchemaV1 = z.object({
  type: z.union([
    z.literal(1), // dandanplay
    z.literal(0), // custom
  ]),
  comments: z.array(importCommentSchema),
  version: z.number(),
  timeUpdated: z.number(),
  schemaVersion: z.literal(1).optional().default(1), // Does not exist in v1, but we can default it to 1
})

const v1 = {
  dandanPlay: z.discriminatedUnion('type', [
    baseSchemaV1.extend({
      type: z.literal(1), // dandanplay
      params: z.object({
        chConvert: z.nativeEnum(DanDanChConvert).optional(),
        withRelated: z.boolean().optional(),
        from: z.number().optional(),
      }),
      meta: z.object({
        type: z.literal(1),
        episodeId: z.number(),
        animeId: z.number(),
        episodeTitle: z.string().optional(),
        animeTitle: z.string(),
      }),
    }),
  ]),
  custom: z.discriminatedUnion('type', [
    baseSchemaV1.extend({
      type: z.literal(0), // custom
      meta: z
        .object({
          type: z.literal(0),
          animeTitle: z.string(),
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

export const importSchemaV1 = z.discriminatedUnion('type', [
  ...v1.dandanPlay.options,
  ...v1.custom.options,
])
