import { z } from 'zod'
import type { DbEntity } from '../../provider/provider.js'

export const zBaseSeasonV1 = z.object({
  title: z.string(),
  type: z.string().optional(),
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

// `providerIds` is shape-validated by the manifest that produced it, not by
// the storage schema. Stored as an opaque payload that the manifest's danmaku
// pipeline knows how to consume on refetch.
export const zSeasonInsertV1 = zBaseSeasonV1.extend({
  providerIds: z.record(z.string(), z.unknown()),
  manifestId: z.string(),
  // The provider config instance that fetched this season. With indexedId it
  // is the season's identity. It may name a config that no longer exists, in
  // which case the season is an orphan.
  providerConfigId: z.string(),
})

export type SeasonInsertV1 = z.infer<typeof zSeasonInsertV1>

export type SeasonV1 = DbEntity<SeasonInsertV1>
