import type {
  Episode,
  EpisodeMeta,
  EpisodeStub,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { GetCommentQuery } from '@danmaku-anywhere/danmaku-provider/ddp'

export type EpisodeFetchBySeasonParams = {
  seasonId: number
}

export type EpisodeQueryFilter = {
  id?: number
  seasonId?: number
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
  // No user asked for this fetch, so an empty result is not saved
  automatic?: boolean
  dandanplay?: GetCommentQuery
}

export type DanmakuFetchByMeta = {
  type: 'by-meta'
  meta: WithSeason<EpisodeMeta>
  options?: DanmakuFetchOptions
}

export type DanmakuFetchByStub = {
  type: 'by-stub'
  stub: EpisodeStub
  seasonId: number
  options?: DanmakuFetchOptions
}

export type DanmakuFetchRequest = DanmakuFetchByMeta | DanmakuFetchByStub

export type DanmakuFetchDto = DanmakuFetchRequest

export type KeptStored = {
  fetchedCount: number
  storedCount: number
}

export type DanmakuFetchResult = {
  episode: WithSeason<Episode>
  // Set when a refetch returned fewer comments than were stored, in which case
  // `episode` is the stored record, unchanged
  keptStored?: KeptStored
}

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
              type: string
              title: string
              seasonId: number
              seasonTitle: string
            }[]
          >
        }
      }
  )[]
  alreadyImported: {
    title: string
  }[]
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
