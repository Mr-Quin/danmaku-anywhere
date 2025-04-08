import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import type { GetCommentQuery } from '@danmaku-anywhere/danmaku-provider/ddp'

import {
  BilibiliSeasonV1,
  DanDanPlaySeasonV1,
  TencentSeasonV1,
} from '@/common/anime/types/v1/schema'
import type {
  DanmakuSourceType,
  RemoteDanmakuSourceType,
} from '@/common/danmaku/enums'
import { DbEntity } from '@/common/types/dbEntity'
import { ByProvider } from '@/common/types/utils'

interface BaseEpisodeV4 {
  // Episode title
  title: string
  // Episode number
  episodeNumber?: number | string
  // Cover image url
  imageUrl?: string
  // Link to source
  externalLink?: string
  // alternative title
  alternativeTitle?: string[]
  provider: DanmakuSourceType
  // unique id within the provider for indexing
  indexedId: string
  // foreign key in the season table
  seasonId: number
  comments: CommentEntity[]
  commentCount: number
  schemaVersion: 4
  // The last time we checked for updates
  lastChecked: number
}

export type CustomEpisodeInsertV4 = Readonly<{
  provider: DanmakuSourceType.Custom
  title: string
  comments: CommentEntity[]
  commentCount: number
  schemaVersion: 4
}>

export type CustomEpisodeV4 = DbEntity<CustomEpisodeInsertV4>

export type CustomEpisodeLite = Omit<CustomEpisodeV4, 'comments'>

type EpisodeV4ProviderMap = {
  [DanmakuSourceType.DanDanPlay]: {
    providerIds: {
      episodeId: number
    }
    /**
     * The params used to fetch the comments
     */
    params?: Partial<GetCommentQuery>
  }
  [DanmakuSourceType.Bilibili]: {
    providerIds: {
      cid: number

      epid?: number
      aid?: number
      bvid?: string
    }
  }
  [DanmakuSourceType.Tencent]: {
    providerIds: {
      vid: string
    }
  }
}

type EpisodeV4SeasonMap = {
  [DanmakuSourceType.DanDanPlay]: {
    season: DanDanPlaySeasonV1
  }
  [DanmakuSourceType.Bilibili]: {
    season: BilibiliSeasonV1
  }
  [DanmakuSourceType.Tencent]: {
    season: TencentSeasonV1
  }
}

export type WithSeason<T> = T extends { provider: RemoteDanmakuSourceType }
  ? Readonly<T & EpisodeV4SeasonMap[T['provider']]>
  : never

export type EpisodeV4Of<T extends RemoteDanmakuSourceType> = Readonly<
  BaseEpisodeV4 & {
    provider: T
  } & EpisodeV4ProviderMap[T]
>

export type EpisodeV4 = {
  [K in RemoteDanmakuSourceType]: DbEntity<EpisodeV4Of<K>>
}[RemoteDanmakuSourceType]

export type EpisodeInsertV4 = {
  [K in RemoteDanmakuSourceType]: EpisodeV4Of<K>
}[RemoteDanmakuSourceType]

export type EpisodeLiteV4 = {
  [K in RemoteDanmakuSourceType]: Omit<DbEntity<EpisodeV4Of<K>>, 'comments'>
}[RemoteDanmakuSourceType]

export type DanDanPlayEpisodeV4 = ByProvider<
  EpisodeV4,
  DanmakuSourceType.DanDanPlay
>
export type BiliBiliEpisodeV4 = ByProvider<
  EpisodeV4,
  DanmakuSourceType.Bilibili
>
export type TencentEpisodeV4 = ByProvider<EpisodeV4, DanmakuSourceType.Tencent>

export type EpisodeMeta = {
  [K in RemoteDanmakuSourceType]: Omit<
    EpisodeV4Of<K>,
    'comments' | 'commentCount'
  >
}[RemoteDanmakuSourceType]

export type DanDanPlayMeta = ByProvider<
  EpisodeMeta,
  DanmakuSourceType.DanDanPlay
>
export type BiliBiliMeta = ByProvider<EpisodeMeta, DanmakuSourceType.Bilibili>
export type TencentMeta = ByProvider<EpisodeMeta, DanmakuSourceType.Tencent>
