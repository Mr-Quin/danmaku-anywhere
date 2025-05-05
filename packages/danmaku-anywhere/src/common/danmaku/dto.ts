import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import { EpisodeMeta, WithSeason } from '@/common/danmaku/types/v4/schema'

export type EpisodeQueryFilter = {
  id?: number
  seasonId?: number
  provider?: RemoteDanmakuSourceType
  indexedId?: string
}

export interface DanmakuFetchContext {
  seasonMapKey?: string
}

interface DanmakuFetchOptions {
  forceUpdate?: boolean // force update danmaku from the provider even if it's already in db
}

interface BaseDanmakuFetchDto {
  options?: DanmakuFetchOptions
  context?: DanmakuFetchContext
}

export type DanmakuFetchDto = {
  meta: WithSeason<EpisodeMeta>
} & BaseDanmakuFetchDto

export type DanmakuDeleteDto = number

export interface CustomDanmakuCreateData {
  comments: {
    p: string
    m: string
  }[]
  seasonTitle: string
  episodeTitle: string
}
