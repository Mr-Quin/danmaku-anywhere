import type {
  BilibiliBangumiInfo,
  BilibiliSearchResult,
} from '@danmaku-anywhere/danmaku-provider/bilibili'
import type {
  BangumiDetails,
  SearchAnimeDetails,
} from '@danmaku-anywhere/danmaku-provider/ddp'
import type {
  TencentEpisodeListItem,
  TencentSearchResult,
} from '@danmaku-anywhere/danmaku-provider/tencent'

import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanDanPlayMeta } from '@/common/danmaku/models/meta'

export interface MediaSearchParams {
  keyword: string
  episode?: string
}

export interface DanDanPlayMediaSearchResult {
  provider: DanmakuSourceType.DanDanPlay
  data: SearchAnimeDetails[]
}

export interface BilibiliMediaSearchResult {
  provider: DanmakuSourceType.Bilibili
  data: BilibiliSearchResult
}

export interface TencentMediaSearchResult {
  provider: DanmakuSourceType.Tencent
  data: TencentSearchResult
}

export type MediaSearchResult =
  | DanDanPlayMediaSearchResult
  | BilibiliMediaSearchResult
  | TencentMediaSearchResult

export type BilibiliSeason = BilibiliSearchResult[number]

export type DanDanPlaySeason = SearchAnimeDetails

export type TencentSeason = TencentSearchResult[number]

export type MediaSeason = BilibiliSeason | DanDanPlaySeason | TencentSeason

export type BilibiliEpisode = BilibiliBangumiInfo['episodes'][number]

export type DanDanPlayEpisode = BangumiDetails['episodes'][number]

export type TencentEpisode = TencentEpisodeListItem

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
      data: DanDanPlayMeta
    }
  | {
      status: 'disambiguation'
      data: DanDanPlayMediaSearchResult
    }
  | {
      status: 'notFound'
      data: null
    }
