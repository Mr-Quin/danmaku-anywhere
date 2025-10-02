import { z } from 'zod'
import {
  type ByProvider,
  DanmakuSourceType,
  type DbEntity,
  type RemoteDanmakuSourceType,
} from '../../provider/provider.js'

export const zBaseSeasonV1 = z.object({
  title: z.string(),
  type: z.string(),
  imageUrl: z.string().optional(),
  externalLink: z.string().optional(),
  alternativeTitles: z.array(z.string()).optional(),
  indexedId: z.string(),
  episodeCount: z.number().optional(),
  // the number of episodes for this season that are actually available locally
  localEpisodeCount: z.number().optional(),
  year: z.number().optional(),
  schemaVersion: z.literal(1),
})

export const zDanDanPlaySeasonProviderIds = z.object({
  animeId: z.number(),
  bangumiId: z.string(),
  // ID of the provider instance that fetched this data
  // For built-in dandanplay, this is 'builtin-dandanplay'
  // For custom dandanplay-compatible providers, this is the UUID of the provider
  providerInstanceId: z.string().optional(),
})

export const zBilibiliSeasonProviderIds = z.object({
  seasonId: z.number(),
  mediaId: z.number().optional(),
})

export const zTencentSeasonProviderIds = z.object({
  cid: z.string(),
})

export const zDanDanPlaySeasonV1 = zBaseSeasonV1.extend({
  provider: z.literal(DanmakuSourceType.DanDanPlay),
  providerIds: zDanDanPlaySeasonProviderIds,
})

export const zBilibiliSeasonV1 = zBaseSeasonV1.extend({
  provider: z.literal(DanmakuSourceType.Bilibili),
  providerIds: zBilibiliSeasonProviderIds,
})

export const zTencentSeasonV1 = zBaseSeasonV1.extend({
  provider: z.literal(DanmakuSourceType.Tencent),
  providerIds: zTencentSeasonProviderIds,
})

export const zSeasonInsertV1 = z.discriminatedUnion('provider', [
  zDanDanPlaySeasonV1,
  zBilibiliSeasonV1,
  zTencentSeasonV1,
])

export type SeasonInsertV1 = z.infer<typeof zSeasonInsertV1>

export type SeasonV1 = {
  [K in RemoteDanmakuSourceType]: DbEntity<ByProvider<SeasonInsertV1, K>>
}[RemoteDanmakuSourceType]
