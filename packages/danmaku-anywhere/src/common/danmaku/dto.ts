import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import type {
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'

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

export interface CustomDanmakuImportData {
  comments: unknown
  title: string
}

export type ImportError = {
  title: string
  index: number
  // serialized error message
  error: string
}

export type CustomDanmakuImportResult = {
  // titles that are successfully imported
  succeeded: string[]
  errors: ImportError[]
}
