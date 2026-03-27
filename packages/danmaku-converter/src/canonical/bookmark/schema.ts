import { z } from 'zod'
import {
  zBilibiliProviderIds,
  zDanDanPlayProviderIds,
  zTencentProviderIds,
} from '../episode/v4/schema.js'
import { DanmakuSourceType, type DbEntity } from '../provider/provider.js'

const zBaseEpisodeStub = z.object({
  title: z.string(),
  episodeNumber: z.union([z.number(), z.string()]).optional(),
  indexedId: z.string(),
})

export const zDanDanPlayEpisodeStub = zBaseEpisodeStub.extend({
  provider: z.literal(DanmakuSourceType.DanDanPlay),
  providerIds: zDanDanPlayProviderIds,
})

export const zBilibiliEpisodeStub = zBaseEpisodeStub.extend({
  provider: z.literal(DanmakuSourceType.Bilibili),
  providerIds: zBilibiliProviderIds,
})

export const zTencentEpisodeStub = zBaseEpisodeStub.extend({
  provider: z.literal(DanmakuSourceType.Tencent),
  providerIds: zTencentProviderIds,
})

export const zEpisodeStub = z.discriminatedUnion('provider', [
  zDanDanPlayEpisodeStub,
  zBilibiliEpisodeStub,
  zTencentEpisodeStub,
])

export type EpisodeStub = z.infer<typeof zEpisodeStub>

export const zBookmarkInsert = z.object({
  seasonId: z.number(),
  providerConfigId: z.string(),
  episodes: z.array(zEpisodeStub),
  lastRefreshed: z.number(),
})

export type BookmarkInsert = z.infer<typeof zBookmarkInsert>

export type Bookmark = DbEntity<BookmarkInsert>
