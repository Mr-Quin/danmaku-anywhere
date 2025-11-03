import { z } from 'zod'
import { BiliBiliMediaType, DanDanChConvert } from '../../../utils/index.js'
import { zCommentImport } from '../../comment/index.js'
import { DanmakuSourceType } from '../../provider/provider.js'

const zBaseEpisodeV3 = z.object({
  provider: z.nativeEnum(DanmakuSourceType),
  comments: z.array(zCommentImport),
  commentCount: z.number(),
  version: z.number(),
  timeUpdated: z.number(),
  schemaVersion: z.union([
    z.literal(2), // some export data may have schemaVersion 2
    z.literal(3),
  ]),
})

const schema = {
  custom: z.discriminatedUnion('provider', [
    zBaseEpisodeV3.extend({
      provider: z.literal(DanmakuSourceType.MacCMS),
      meta: z.object({
        provider: z.literal(DanmakuSourceType.MacCMS),
        seasonTitle: z.string(),
        episodeTitle: z.string(),
      }),
      episodeTitle: z.string(),
      seasonTitle: z.string(),
    }),
  ]),
  dandanPlay: z.discriminatedUnion('provider', [
    zBaseEpisodeV3.extend({
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
    zBaseEpisodeV3.extend({
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
    zBaseEpisodeV3.extend({
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

export const zEpisodeImportV3 = z.discriminatedUnion('provider', [
  ...schema.custom.options,
  ...schema.dandanPlay.options,
  ...schema.bilibili.options,
  ...schema.tencent.options,
])
