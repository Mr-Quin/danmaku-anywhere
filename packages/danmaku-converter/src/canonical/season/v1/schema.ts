import { z } from 'zod'
import { DanmakuSourceType, type DbEntity } from '../../provider/provider.js'

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

// `providerIds` is shape-validated by the manifest that produced it, not by
// the storage schema. Stored as an opaque payload that the manifest's danmaku
// pipeline knows how to consume on refetch.
export const zSeasonInsertV1 = zBaseSeasonV1.extend({
  provider: z.enum(DanmakuSourceType),
  providerIds: z.record(z.string(), z.unknown()),
  providerConfigId: z.string(),
  // Durable identity of the source manifest. providerConfigId is only the
  // instance handle used at fetch time and changes when a config is deleted
  // and re-added; manifestId survives that, so orphaned seasons can reparent.
  manifestId: z.string().optional(),
  // The content namespace the providerIds are valid in. Self-hosted instances
  // that share a manifest have separate id spaces, so this is what a live
  // config is matched against to reparent (manifestId alone is too coarse).
  namespaceKey: z.string().optional(),
})

export type SeasonInsertV1 = z.infer<typeof zSeasonInsertV1>

export type SeasonV1 = DbEntity<SeasonInsertV1>
