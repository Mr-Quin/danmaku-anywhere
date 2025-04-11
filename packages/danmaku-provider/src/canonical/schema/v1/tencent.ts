import { z } from 'zod'
import { DanmakuSourceType, zBaseEpisode, zBaseSeason } from './base.js'

const zTencentSeasonProviderIds = z.object({
  cid: z.string(), // Content ID (usually the primary identifier)
})
const zTencentEpisodeProviderIds = z.object({
  vid: z.string(), // Video ID (primary identifier for the episode)
})

export const zTencentSeason = zBaseSeason.extend({
  provider: z.literal(DanmakuSourceType.Tencent),
  /** IDs required to interact with the Tencent API for this season. */
  providerIds: zTencentSeasonProviderIds,
})

export const zTencentEpisode = zBaseEpisode.extend({
  provider: z.literal(DanmakuSourceType.Tencent),
  /** IDs required to interact with the Tencent API for this episode. */
  providerIds: zTencentEpisodeProviderIds,
  /** IDs required to link back to the specific Tencent season. */
  seasonProviderIds: zTencentSeasonProviderIds,
})

export type TencentSeason = z.infer<typeof zTencentSeason>
export type TencentEpisode = z.infer<typeof zTencentEpisode>
