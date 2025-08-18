import type {
  CustomEpisode,
  DanDanPlayOf,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { DanmakuSourceType } from '@/common/danmaku/enums'

export interface SeasonSearchParams {
  keyword: string
  episode?: string
  provider: DanmakuSourceType
  // used for custom search
  customBaseUrl: string
}

export type SeasonQueryFilter = {
  id?: number
  provider?: DanmakuSourceType
  indexedId?: string
}

export interface MatchEpisodeInput {
  mapKey: string
  title: string
  episodeNumber?: number
  // if available, use seasonId to disambiguate
  seasonId?: number
}

export type MatchEpisodeResult =
  | {
      status: 'success'
      data: WithSeason<DanDanPlayOf<EpisodeMeta>> | CustomEpisode
    }
  | {
      status: 'disambiguation'
      data: DanDanPlayOf<Season>[]
    }
  | {
      status: 'notFound'
      data: null
    }

export interface GenericVodSearchData {
  baseUrl: string
  keyword: string
}
