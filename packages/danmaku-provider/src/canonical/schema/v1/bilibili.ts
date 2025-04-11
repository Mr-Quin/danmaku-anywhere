import { z } from 'zod'
import { DanmakuSourceType, zBaseEpisode, zBaseSeason } from './base.js'

const zBiliSeasonProviderIds = z.object({
  seasonId: z.number(), // ssid
  mediaId: z.number().optional(), // mdid (might be redundant if seasonId is present)
})

const zBiliEpisodeProviderIds = z.object({
  cid: z.number(), // Crucial for fetching comments/playback info
  epid: z.number().optional(), // Episode ID (id field in original schema)
  aid: z.number().optional(), // Archive ID
  bvid: z.string().optional(), // BV ID
})

export const zBiliSeason = zBaseSeason.extend({
  provider: z.literal(DanmakuSourceType.Bilibili),
  /** IDs required to interact with the Bilibili API for this season. */
  providerIds: zBiliSeasonProviderIds,
})

export const zBiliEpisode = zBaseEpisode.extend({
  provider: z.literal(DanmakuSourceType.Bilibili),
  /** IDs required to interact with the Bilibili API for this episode. */
  providerIds: zBiliEpisodeProviderIds,
  /** IDs required to link back to the specific Bilibili season. */
  seasonProviderIds: zBiliSeasonProviderIds,
})

export type BiliSeason = z.infer<typeof zBiliSeason>
export type BiliEpisode = z.infer<typeof zBiliEpisode>
