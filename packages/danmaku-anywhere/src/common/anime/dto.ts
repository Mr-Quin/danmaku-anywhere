import type {
  BilibiliBangumiInfo,
  BilibiliSearchResult,
} from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { DanDanAnimeSearchResult } from '@danmaku-anywhere/danmaku-provider/ddp'
import type {
  TencentSearchResult,
  TencentEpisodeListItem,
} from '@danmaku-anywhere/danmaku-provider/tencent'

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

export interface TencentMediaSearchResult {
  provider: DanmakuSourceType.Tencent
  data: TencentSearchResult
}

export type MediaSearchResult =
  | DanDanPlayMediaSearchResult
  | BilibiliMediaSearchResult
  | TencentMediaSearchResult

export type BilibiliEpisode = BilibiliBangumiInfo['episodes'][number]

export type DanDanPlayEpisode =
  DanDanAnimeSearchResult[number]['episodes'][number]

export type TencentEpisode = TencentEpisodeListItem

export type SeasonSearchResult =
  | {
      provider: DanmakuSourceType.Bilibili
      data: BilibiliBangumiInfo
    }
  | {
      provider: DanmakuSourceType.DanDanPlay
      data: DanDanAnimeSearchResult[number]
    }
  | {
      provider: DanmakuSourceType.Tencent
      data: TencentSearchResult[number]
    }

export type GetEpisodeDto =
  | {
      provider: DanmakuSourceType.Bilibili
      seasonId: number
    }
  | {
      provider: DanmakuSourceType.Tencent
      seasonId: string // cid
    }

export type GetEpisodeResult =
  | {
      provider: DanmakuSourceType.Bilibili
      data: BilibiliBangumiInfo
    }
  | {
      provider: DanmakuSourceType.Tencent
      data: TencentEpisodeListItem[]
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
