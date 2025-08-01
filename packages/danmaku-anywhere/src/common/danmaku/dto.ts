import type {
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type {
  DanmakuSourceType,
  RemoteDanmakuSourceType,
} from '@/common/danmaku/enums'

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

interface DanmakuFetchOptions {
  forceUpdate?: boolean // force update danmaku from the provider even if it's already in db
}

interface BaseDanmakuFetchDto {
  options?: DanmakuFetchOptions
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
          imported: Record<
            string,
            {
              type: DanmakuSourceType
              title: string
              seasonId: number
              seasonTitle: string
            }[]
          >
        }
      }
  )[]
  error: {
    title: string
    message: string
  }[]
}
