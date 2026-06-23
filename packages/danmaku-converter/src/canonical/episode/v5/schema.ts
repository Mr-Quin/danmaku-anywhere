import { z } from 'zod'
import { stripHtml } from '../../../utils/index.js'
import { DanmakuSourceType, type DbEntity } from '../../provider/provider.js'

export const zCustomEpisodeInsertV5 = z.object({
  provider: z.literal(DanmakuSourceType.MacCMS),
  title: z.string().refine(stripHtml),
  commentsChunkId: z.number(),
  commentCount: z.number(),
  schemaVersion: z.literal(5),
})

export type CustomEpisodeInsertV5 = z.infer<typeof zCustomEpisodeInsertV5>

export type CustomEpisodeV5 = DbEntity<CustomEpisodeInsertV5>

export type CustomEpisodeLiteV5 = CustomEpisodeV5

const zBaseEpisodeV5 = z.object({
  title: z.string().refine(stripHtml),
  episodeNumber: z.union([z.number(), z.string()]).optional(),
  imageUrl: z.url().optional(),
  externalLink: z.url().optional(),
  alternativeTitle: z.array(z.string()).optional(),
  indexedId: z.string(),
  seasonId: z.number(),
  commentsChunkId: z.number(),
  commentCount: z.number(),
  schemaVersion: z.literal(5),
  lastChecked: z.number(),
})

export const zDanDanPlayProviderIds = z.object({
  episodeId: z.number(),
})

export const zDanDanPlayParams = z.object({
  episodeId: z.number().optional(),
  animeId: z.number().optional(),
  withRelated: z.boolean().optional(),
  chConvert: z.boolean().optional(),
})

export const zBilibiliProviderIds = z.object({
  cid: z.number(),
  epid: z.number().optional(),
  aid: z.number().optional(),
  bvid: z.string().optional(),
})

export const zTencentProviderIds = z.object({
  vid: z.string(),
})

export const zDanDanPlayEpisodeV5 = zBaseEpisodeV5.extend({
  provider: z.literal(DanmakuSourceType.DanDanPlay),
  providerIds: zDanDanPlayProviderIds,
  params: zDanDanPlayParams.optional(),
})

export const zBilibiliEpisodeV5 = zBaseEpisodeV5.extend({
  provider: z.literal(DanmakuSourceType.Bilibili),
  providerIds: zBilibiliProviderIds,
})

export const zTencentEpisodeV5 = zBaseEpisodeV5.extend({
  provider: z.literal(DanmakuSourceType.Tencent),
  providerIds: zTencentProviderIds,
})

export const zEpisodeInsertV5 = z.discriminatedUnion('provider', [
  zDanDanPlayEpisodeV5,
  zBilibiliEpisodeV5,
  zTencentEpisodeV5,
])

export type DanDanPlayEpisodeInsertV5 = z.infer<typeof zDanDanPlayEpisodeV5>
export type BilibiliEpisodeInsertV5 = z.infer<typeof zBilibiliEpisodeV5>
export type TencentEpisodeInsertV5 = z.infer<typeof zTencentEpisodeV5>

export type EpisodeInsertV5 = z.infer<typeof zEpisodeInsertV5>

export type DanDanPlayEpisodeV5 = DbEntity<DanDanPlayEpisodeInsertV5>
export type BilibiliEpisodeV5 = DbEntity<BilibiliEpisodeInsertV5>
export type TencentEpisodeV5 = DbEntity<TencentEpisodeInsertV5>

export type EpisodeV5 =
  | DanDanPlayEpisodeV5
  | BilibiliEpisodeV5
  | TencentEpisodeV5

export type EpisodeLiteV5 = EpisodeV5

export type EpisodeMetaV5 = Omit<
  EpisodeInsertV5,
  'commentsChunkId' | 'commentCount'
>

export type EpisodeImportV5 = Omit<EpisodeInsertV5, 'seasonId'>
