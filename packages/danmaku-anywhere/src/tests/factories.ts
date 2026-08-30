import type {
  Episode,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

// What Dexie's season table accepts on insert: the canonical insert plus the
// bookkeeping columns the db assigns an id for.
type SeasonRow = Omit<Season, 'id'>

export function makeProviderConfig(
  overrides: Partial<ProviderConfig> = {}
): ProviderConfig {
  return {
    id: 'provider-1',
    manifestId: 'dandanplay',
    name: 'DanDanPlay',
    enabled: true,
    configValues: {},
    ...overrides,
  }
}

export function makeSeasonInsert(
  overrides: Partial<SeasonInsert> = {}
): SeasonInsert {
  return {
    title: 'Test season',
    type: 'anime',
    indexedId: 'season-1',
    providerIds: {},
    schemaVersion: 1,
    ...overrides,
  }
}

export function makeSeasonRow(overrides: Partial<SeasonRow> = {}): SeasonRow {
  const { version = 1, timeUpdated = 0, ...insertOverrides } = overrides
  return { ...makeSeasonInsert(insertOverrides), version, timeUpdated }
}

export function makeSeason(overrides: Partial<Season> = {}): Season {
  const { id = 1, ...rowOverrides } = overrides
  return { ...makeSeasonRow(rowOverrides), id }
}

export function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 1,
    version: 1,
    timeUpdated: 0,
    title: 'Test episode',
    indexedId: 'episode-1',
    seasonId: 1,
    providerIds: {},
    comments: [],
    commentCount: 0,
    schemaVersion: 4,
    lastChecked: 0,
    ...overrides,
  }
}
