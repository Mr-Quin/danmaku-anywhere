import { z } from 'zod'
import { DanmakuSourceType, type DbEntity } from '../provider/provider.js'

export const zEpisodeStub = z.object({
  provider: z.enum(DanmakuSourceType),
  providerIds: z.record(z.string(), z.unknown()),
  title: z.string(),
  episodeNumber: z.union([z.number(), z.string()]).optional(),
  indexedId: z.string(),
})

export type EpisodeStub = z.infer<typeof zEpisodeStub>

export const zBookmarkInsert = z.object({
  seasonId: z.number(),
  providerConfigId: z.string(),
  episodes: z.array(zEpisodeStub),
  lastRefreshed: z.number(),
})

export type BookmarkInsert = z.infer<typeof zBookmarkInsert>

export type Bookmark = DbEntity<BookmarkInsert>
