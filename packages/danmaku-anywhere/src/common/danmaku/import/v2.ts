import { BiliBiliMediaType } from '@danmaku-anywhere/danmaku-provider/bilibili'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { z } from 'zod'

import { importCommentSchema } from '@/common/danmaku/import/commentSchema'

const baseSchemaV2 = z.object({
  provider: z.union([
    z.literal(0), // custom
    z.literal(1), // dandanplay
    z.literal(2), // bilibili
    z.literal(3), // tencent
  ]),
  comments: z.array(importCommentSchema),
  commentCount: z.number(),
  version: z.number(),
  timeUpdated: z.number(),
  schemaVersion: z.literal(2),
})

const v2 = {
  dandanPlay: z.discriminatedUnion('provider', [
    baseSchemaV2.extend({
      provider: z.literal(1),
      params: z
        .object({
          chConvert: z.nativeEnum(DanDanChConvert).optional(),
          withRelated: z.boolean().optional(),
          from: z.number().optional(),
        })
        .optional(),
      meta: z.object({
        provider: z.literal(1),
        episodeId: z.number(),
        animeId: z.number(),
        episodeTitle: z.string(),
        animeTitle: z.string(),
      }),
      episodeId: z.number(),
      seasonId: z.number(),
      episodeTitle: z.string(),
      seasonTitle: z.string(),
    }),
  ]),
  bilibili: z.discriminatedUnion('provider', [
    baseSchemaV2.extend({
      provider: z.literal(2),
      meta: z.object({
        provider: z.literal(2),
        cid: z.number(),
        bvid: z.string().optional(),
        aid: z.number(),
        seasonId: z.number(),
        title: z.string(),
        seasonTitle: z.string(),
        mediaType: z.nativeEnum(BiliBiliMediaType),
      }),
      episodeId: z.number(),
      seasonId: z.number(),
      episodeTitle: z.string(),
      seasonTitle: z.string(),
    }),
  ]),
  tencent: z.discriminatedUnion('provider', [
    baseSchemaV2.extend({
      provider: z.literal(3),
      meta: z.object({
        provider: z.literal(3),
        vid: z.string(),
        cid: z.string(),
        episodeTitle: z.string(),
        seasonTitle: z.string(),
      }),
      episodeId: z.string(),
      seasonId: z.string(),
      episodeTitle: z.string(),
      seasonTitle: z.string(),
    }),
  ]),
  custom: z.discriminatedUnion('provider', [
    baseSchemaV2.extend({
      provider: z.literal(0),
      meta: z.object({
        provider: z.literal(0),
        seasonTitle: z.string(),
        episodeTitle: z.string(),
      }),
      episodeTitle: z.string(),
      seasonTitle: z.string(),
    }),
  ]),
}

export const importSchemaV2 = z.discriminatedUnion('provider', [
  ...v2.dandanPlay.options,
  ...v2.custom.options,
  ...v2.bilibili.options,
  ...v2.tencent.options,
])
