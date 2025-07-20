import type {
  CustomEpisodeInsertV4,
  CustomEpisodeLiteV4,
  CustomEpisodeV4,
  EpisodeInsertV4,
  EpisodeLiteV4,
  EpisodeMetaV4,
  EpisodeV4,
  WithSeasonV1,
} from './v4/schema.js'

export * from './migration/migration.js'
export * from './v3/schema.js'
export * from './v4/schema.js'

export const EPISODE_SCHEMA_VERSION = 4 as const

export type Episode = EpisodeV4
export type EpisodeInsert = EpisodeInsertV4
export type EpisodeLite = EpisodeLiteV4
export type EpisodeMeta = EpisodeMetaV4

export type WithSeason<T> = WithSeasonV1<T>

export type CustomEpisode = CustomEpisodeV4
export type CustomEpisodeInsert = CustomEpisodeInsertV4
export type CustomEpisodeLite = CustomEpisodeLiteV4

export type GenericEpisode = WithSeason<Episode> | CustomEpisode
export type GenericEpisodeLite = WithSeason<EpisodeLite> | CustomEpisodeLite
