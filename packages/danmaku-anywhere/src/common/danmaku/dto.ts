import type {
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { GetCommentQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import type {
  DanmakuSourceType,
  RemoteDanmakuSourceType,
} from '@/common/danmaku/enums'

export type EpisodeFetchBySeasonParams = {
  seasonId: number
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
  dandanplay?: GetCommentQuery
}

export type DanmakuFetchRequest = {
  type: 'by-meta'
  meta: WithSeason<EpisodeMeta>
  options?: DanmakuFetchOptions
}

export type DanmakuFetchDto = DanmakuFetchRequest

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

export interface MacCMSFetchData {
  title: string
  url: string
  providerConfigId: string
}
