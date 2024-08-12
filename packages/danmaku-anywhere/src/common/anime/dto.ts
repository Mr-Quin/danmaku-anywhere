import type {
  BilibiliBangumiInfo,
  BilibiliSearchResult,
} from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { DanDanAnimeSearchResult } from '@danmaku-anywhere/danmaku-provider/ddp'

import type { DanmakuProviderType } from '@/common/anime/enums'

export interface MediaSearchParams {
  keyword: string
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
