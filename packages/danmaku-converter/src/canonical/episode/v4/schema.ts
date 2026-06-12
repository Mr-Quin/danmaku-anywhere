import { z } from 'zod'
import { stripHtml } from '../../../utils/index.js'
import { zCommentEntity } from '../../comment/index.js'
import type { DbEntity } from '../../provider/provider.js'
import { type SeasonV1, zSeasonInsertV1 } from '../../season/index.js'

/**
 * Custom episode schema
 */
export const zCustomEpisodeInsertV4 = z.object({
  title: z.string().refine(stripHtml),
  comments: z.array(zCommentEntity),
  commentCount: z.number(),
  schemaVersion: z.literal(4),
})

export type CustomEpisodeInsertV4 = z.infer<typeof zCustomEpisodeInsertV4>

export type CustomEpisodeV4 = DbEntity<CustomEpisodeInsertV4>

export type CustomEpisodeLiteV4 = Omit<CustomEpisodeV4, 'comments'>

/**
 * Remote episode schema
 *
 * `providerIds` is shape-validated by the manifest that produced it, not by
 * the storage schema. Stored as an opaque payload that the manifest's danmaku
 * pipeline knows how to consume on refetch.
 */
export const zEpisodeInsertV4 = z.object({
  // Episode title
  title: z.string().refine(stripHtml),
  // Episode number
  episodeNumber: z.union([z.number(), z.string()]).optional(),
  // Cover image url
  imageUrl: z.url().optional(),
  // Link to source
  externalLink: z.url().optional(),
  // alternative title
  alternativeTitle: z.array(z.string()).optional(),
  providerIds: z.record(z.string(), z.unknown()),
  // unique id within the source for indexing
  indexedId: z.string(),
  // foreign key in the season table
  seasonId: z.number(),
  comments: z.array(zCommentEntity),
  commentCount: z.number(),
  schemaVersion: z.literal(4),
  // The last time we checked for updates
  lastChecked: z.number(),
  // Free-form per-source params carried alongside refetch inputs.
  // Manifests that need extra hints (e.g. dandanplay's chConvert / withRelated)
  // stash them here.
  params: z.record(z.string(), z.unknown()).optional(),
})

export type EpisodeInsertV4 = z.infer<typeof zEpisodeInsertV4>

export type EpisodeV4 = DbEntity<EpisodeInsertV4>

export type EpisodeLiteV4 = Omit<EpisodeV4, 'comments'>

export type EpisodeMetaV4 = Omit<EpisodeInsertV4, 'comments' | 'commentCount'>

export type EpisodeImportV4 = Omit<EpisodeInsertV4, 'seasonId'>

export const zEpisodeInsertV4WithSeasonV1 = zEpisodeInsertV4.extend({
  season: zSeasonInsertV1,
})

export type WithSeasonV1<T extends object> = Readonly<T & { season: SeasonV1 }>
