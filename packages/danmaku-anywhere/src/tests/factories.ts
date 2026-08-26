import type { Episode, Season } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

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

export function makeSeason(overrides: Partial<Season> = {}): Season {
  return {
    id: 1,
    version: 1,
    timeUpdated: 0,
    title: 'Test season',
    type: 'anime',
    indexedId: 'season-1',
    providerIds: {},
    schemaVersion: 1,
    ...overrides,
  }
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
