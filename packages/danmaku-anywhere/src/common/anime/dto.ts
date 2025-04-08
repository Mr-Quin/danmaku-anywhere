import { DanDanPlaySeasonV1 } from '@/common/anime/types/v1/schema'
import { DanDanPlayMeta, WithSeason } from '@/common/danmaku/types/v4/schema'

export interface SeasonSearchParams {
  keyword: string
  episode?: string
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
      data: WithSeason<DanDanPlayMeta>
    }
  | {
      status: 'disambiguation'
      data: DanDanPlaySeasonV1[]
    }
  | {
      status: 'notFound'
      data: null
    }
