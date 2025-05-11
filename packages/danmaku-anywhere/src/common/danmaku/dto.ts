import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import type {
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'

export type EpisodeSearchParams = {
  seasonId: number
  provider: RemoteDanmakuSourceType
}

export type EpisodeQueryFilter = {
  id?: number
  seasonId?: number
  provider?: RemoteDanmakuSourceType
  indexedId?: string
  ids?: number[]
  all?: boolean
}

export type CustomEpisodeQueryFilter = {
  id?: number
  ids?: number[]
  all?: boolean
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

export type DanmakuImportData = {
  title: string
  data: unknown
}

export type DanmakuImportResult = {
  success: (
    | {
        type: 'Custom'
        title: string
      }
    | {
        type: 'Backup'
        title: string
        result: {
          skipped: number
          imported: number
        }
      }
  )[]
  error: {
    title: string
    message: string
  }[]
}
