import type {
  BilibiliBangumiInfo,
  BilibiliSearchResult,
} from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { DanDanAnimeSearchResult } from '@danmaku-anywhere/danmaku-provider/ddp'

import type { DanmakuProviderType } from '@/common/anime/enums'
import type { IntegrationTypeNotNone } from '@/common/danmaku/enums'
import type { DanDanPlayMeta } from '@/common/danmaku/models/meta'

export interface MediaSearchParams {
  keyword: string
  episode?: string
}

export interface MediaSearchParamsData {
  provider: DanmakuProviderType
  params: MediaSearchParams
}

export interface MediaSearchMultiParamsData {
  providers: DanmakuProviderType[]
  params: MediaSearchParams
}

export interface DanDanPlayMediaSearchResult {
  provider: DanmakuProviderType.DanDanPlay
  data: DanDanAnimeSearchResult
}

export interface BilibiliMediaSearchResult {
  provider: DanmakuProviderType.Bilibili
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
      provider: DanmakuProviderType.Bilibili
      data: BilibiliBangumiInfo
    }
  | {
      provider: DanmakuProviderType.DanDanPlay
      data: DanDanAnimeSearchResult[number]
    }

export interface GetEpisodeDto {
  provider: DanmakuProviderType.Bilibili
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
