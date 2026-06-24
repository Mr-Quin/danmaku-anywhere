import type { DanmakuSourceType } from '../provider/provider.js'
import type { WithSeasonV1 } from './v4/schema.js'
import type {
  CustomEpisodeInsertV5,
  CustomEpisodeLiteV5,
  CustomEpisodeV5,
  EpisodeInsertV5,
  EpisodeLiteV5,
  EpisodeMetaV5,
  EpisodeV5,
} from './v5/schema.js'

export * from './migration/migration.js'
export * from './v3/schema.js'
export * from './v4/schema.js'
export * from './v5/index.js'

export const EPISODE_SCHEMA_VERSION = 5 as const

export type Episode = EpisodeV5
export type EpisodeInsert = EpisodeInsertV5
export type EpisodeLite = EpisodeLiteV5
export type EpisodeMeta = EpisodeMetaV5

export type WithSeason<T extends { provider: DanmakuSourceType }> =
  WithSeasonV1<T>

export type CustomEpisode = CustomEpisodeV5
export type CustomEpisodeInsert = CustomEpisodeInsertV5
export type CustomEpisodeLite = CustomEpisodeLiteV5

export type GenericEpisode = WithSeason<Episode> | CustomEpisode
export type GenericEpisodeLite = WithSeason<EpisodeLite> | CustomEpisodeLite
