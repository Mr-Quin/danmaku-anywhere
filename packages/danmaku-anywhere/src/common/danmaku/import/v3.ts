import { BiliBiliMediaType } from '@danmaku-anywhere/danmaku-provider/bilibili'
import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { z } from 'zod'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import { importCommentSchema } from '@/common/danmaku/import/commentSchema'

const baseSchemaV3 = z.object({
  provider: z.nativeEnum(DanmakuSourceType),
  comments: z.array(importCommentSchema),
  commentCount: z.number(),
  version: z.number(),
  timeUpdated: z.number(),
  schemaVersion: z.literal(3),
})

const v3 = {
  custom: z.discriminatedUnion('provider', [
    baseSchemaV3.extend({
      provider: z.literal(DanmakuSourceType.Custom),
      meta: z.object({
        provider: z.literal(DanmakuSourceType.Custom),
        seasonTitle: z.string(),
        episodeTitle: z.string(),
      }),
      episodeTitle: z.string(),
      seasonTitle: z.string(),
    }),
  ]),
  dandanPlay: z.discriminatedUnion('provider', [
    baseSchemaV3.extend({
      provider: z.literal(DanmakuSourceType.DanDanPlay),
      params: z
        .object({
          chConvert: z.nativeEnum(DanDanChConvert).optional(),
          withRelated: z.boolean().optional(),
          from: z.number().optional(),
        })
        .optional(),
      meta: z.object({
        provider: z.literal(DanmakuSourceType.DanDanPlay),
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
    baseSchemaV3.extend({
      provider: z.literal(DanmakuSourceType.Bilibili),
      meta: z.object({
        provider: z.literal(DanmakuSourceType.Bilibili),
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
    baseSchemaV3.extend({
      provider: z.literal(DanmakuSourceType.Tencent),
      meta: z.object({
        provider: z.literal(DanmakuSourceType.Tencent),
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
}

export const importSchemaV3 = z.discriminatedUnion('provider', [
  ...v3.custom.options,
  ...v3.dandanPlay.options,
  ...v3.bilibili.options,
  ...v3.tencent.options,
])
