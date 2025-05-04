import {
  DanmakuSourceType,
  type RemoteDanmakuSourceType,
} from '@/common/danmaku/enums'
import { DbEntity } from '@/common/types/dbEntity'
import { ByProvider } from '@/common/types/utils'

interface BaseSeasonV1 {
  title: string
  type: string
  imageUrl?: string
  externalLink?: string
  alternativeTitles?: string[]
  indexedId: string
  episodeCount?: number
  year?: number
  schemaVersion: 1
}

type SeasonV1ProviderMap = {
  [DanmakuSourceType.DanDanPlay]: {
    providerIds: {
      animeId: number
      bangumiId?: string
    }
  }
  [DanmakuSourceType.Bilibili]: {
    providerIds: {
      seasonId: number
      mediaId?: number
    }
  }
  [DanmakuSourceType.Tencent]: {
    providerIds: {
      cid: string
    }
  }
}

type SeasonEntityV1<T extends RemoteDanmakuSourceType> = Readonly<
  BaseSeasonV1 & {
    provider: T
  } & SeasonV1ProviderMap[T]
>

export type SeasonV1 = {
  [K in RemoteDanmakuSourceType]: DbEntity<SeasonEntityV1<K>>
}[RemoteDanmakuSourceType]

export type SeasonInsertV1 = {
  [K in RemoteDanmakuSourceType]: SeasonEntityV1<K>
}[RemoteDanmakuSourceType]

export type DanDanPlaySeasonV1 = ByProvider<
  SeasonV1,
  DanmakuSourceType.DanDanPlay
>
export type BilibiliSeasonV1 = ByProvider<SeasonV1, DanmakuSourceType.Bilibili>
export type TencentSeasonV1 = ByProvider<SeasonV1, DanmakuSourceType.Tencent>

export type DanDanPlaySeasonInsertV1 = ByProvider<
  SeasonInsertV1,
  DanmakuSourceType.DanDanPlay
>
export type BilibiliSeasonInsertV1 = ByProvider<
  SeasonInsertV1,
  DanmakuSourceType.Bilibili
>
export type TencentSeasonInsertV1 = ByProvider<
  SeasonInsertV1,
  DanmakuSourceType.Tencent
>
