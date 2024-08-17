import type {
  BilibiliBangumiInfo,
  BilibiliSearchResult,
} from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { DanDanAnimeSearchResult } from '@danmaku-anywhere/danmaku-provider/ddp'

import type {
  DanmakuSourceType,
  IntegrationTypeNotNone,
} from '@/common/danmaku/enums'
import type { DanDanPlayMeta } from '@/common/danmaku/models/meta'

export interface MediaSearchParams {
  keyword: string
  episode?: string
}

export interface MediaSearchParamsData {
  provider: DanmakuSourceType
  params: MediaSearchParams
}

export interface MediaSearchMultiParamsData {
  providers: DanmakuSourceType[]
  params: MediaSearchParams
}

export interface DanDanPlayMediaSearchResult {
  provider: DanmakuSourceType.DanDanPlay
  data: DanDanAnimeSearchResult
}

export interface BilibiliMediaSearchResult {
  provider: DanmakuSourceType.Bilibili
  data: BilibiliSearchResult
}

export type MediaSearchResult =
  | DanDanPlayMediaSearchResult
  | BilibiliMediaSearchResult

export type BilibiliEpisode = BilibiliBangumiInfo['episodes'][number]

export type DanDanPlayEpisode =
  DanDanAnimeSearchResult[number]['episodes'][number]

export type SeasonSearchResult =
  | {
      provider: DanmakuSourceType.Bilibili
      data: BilibiliBangumiInfo
    }
  | {
      provider: DanmakuSourceType.DanDanPlay
      data: DanDanAnimeSearchResult[number]
    }

export interface GetEpisodeDto {
  provider: DanmakuSourceType.Bilibili
  seasonId: number
}

export interface MatchEpisodeInput {
  mapKey: string
  title: string
  episodeNumber: number
  integration: IntegrationTypeNotNone
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
