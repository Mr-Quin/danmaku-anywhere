import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import type {
  DanDanPlayOf,
  EpisodeMeta,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import type { WithSeason } from '@danmaku-anywhere/danmaku-converter'

export interface SeasonSearchParams {
  keyword: string
  episode?: string
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
  seasonId?: string | number
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
