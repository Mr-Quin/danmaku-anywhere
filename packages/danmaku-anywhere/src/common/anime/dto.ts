import type {
  CustomEpisode,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import type { MatchingStrategyType } from './MatchingStrategyType'

export interface SeasonSearchRequest {
  keyword: string
  episode?: string
  providerConfigId: string
}

export type SeasonQueryFilter = {
  id?: number
  provider?: DanmakuSourceType
  providerConfigId?: string
  indexedId?: string
}

export interface MatchEpisodeInput {
  mapKey: string
  title: string
  episodeNumber?: number
  // if available, use seasonId to disambiguate
  seasonId?: number
}

export interface MatchEpisodeMetadata {
  providerConfig?: ProviderConfig
  strategy: MatchingStrategyType
}

export type MatchEpisodeResult =
  | {
      status: 'success'
      data: WithSeason<EpisodeMeta> | CustomEpisode
      metadata: MatchEpisodeMetadata
    }
  | {
      status: 'disambiguation'
      data: Season[]
      metadata: MatchEpisodeMetadata
    }
  | {
      status: 'notFound'
      data: null
      cause: string
    }

export interface GenericVodSearchData {
  baseUrl: string
  keyword: string
}
