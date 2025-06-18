import type {
  DanDanPlayOf,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'

export interface SeasonSearchParams {
  keyword: string
  episode?: string
  provider: RemoteDanmakuSourceType
}

export type SeasonQueryFilter = {
  id?: number
  provider?: RemoteDanmakuSourceType
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
      data: WithSeason<DanDanPlayOf<EpisodeMeta>>
    }
  | {
      status: 'disambiguation'
      data: DanDanPlayOf<Season>[]
    }
  | {
      status: 'notFound'
      data: null
    }
