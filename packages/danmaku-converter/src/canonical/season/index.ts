import type { z } from 'zod'
import type { DanmakuSourceType, DbEntity } from '../provider/provider.js'
import type { SeasonInsertV1, SeasonV1, zBaseSeasonV1 } from './v1/schema.js'

export * from './v1/schema.js'

export const SEASON_SCHEMA_VERSION = 1

export type Season = SeasonV1
export type SeasonInsert = SeasonInsertV1
// Not a real season, only used to represent a group of custom episodes
export type CustomSeason = DbEntity<z.infer<typeof zBaseSeasonV1>> & {
  provider: DanmakuSourceType.Custom
  providerIds: {}
}
