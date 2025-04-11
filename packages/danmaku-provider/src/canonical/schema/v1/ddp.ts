import { z } from 'zod'
import { DanmakuSourceType, zBaseEpisode, zBaseSeason } from './base.js'

const zDanDanSeasonProviderIds = z.object({
  animeId: z.number(),
  bangumiId: z.string().optional(), // Often present, maps to external Bangumi.tv ID
})

const zDanDanEpisodeProviderIds = z.object({
  episodeId: z.number(),
})

export const zDanDanSeason = zBaseSeason.extend({
  provider: z.literal(DanmakuSourceType.DanDanPlay),
  /** IDs required to interact with the DanDanPlay API for this season. */
  providerIds: zDanDanSeasonProviderIds,
})

export const zDanDanEpisode = zBaseEpisode.extend({
  provider: z.literal(DanmakuSourceType.DanDanPlay),
  /** IDs required to interact with the DanDanPlay API for this episode. */
  providerIds: zDanDanEpisodeProviderIds,
  /** IDs required to link back to the specific DanDanPlay season. */
  seasonProviderIds: zDanDanSeasonProviderIds,
})

export type DanDanSeason = z.infer<typeof zDanDanSeason>
export type DanDanEpisode = z.infer<typeof zDanDanEpisode>
