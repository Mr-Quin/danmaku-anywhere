import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  CustomDanmaku,
  CustomDanmakuInsert,
  DanDanPlayDanmaku,
} from '@/common/danmaku/models/danmakuCache/db'

export type DanDanPlayDanmakuCache = DanDanPlayDanmaku & {
  type: DanmakuSourceType.DDP
  count: number
}

export type CustomDanmakuCache = CustomDanmaku & {
  type: DanmakuSourceType.Custom
  count: number
}

export type DanmakuCache = DanDanPlayDanmakuCache | CustomDanmakuCache

export type DanDanPlayDanmakuImport = DanDanPlayDanmaku & {
  type: DanmakuSourceType.DDP
}

export type CustomDanmakuImport = CustomDanmakuInsert & {
  type: DanmakuSourceType.Custom
}

export type DanmakuImport = DanDanPlayDanmakuImport | CustomDanmakuImport

/**
 * A lite version of DanmakuCache, only contains count and meta
 * To reduce the size of the cache for cases where comments are not needed
 */
export type DanmakuCacheLite = Pick<DanmakuCache, 'meta' | 'type'> & {
  // The count of comments
  count: number
}

export interface CustomDanmakuCreateData {
  comments: {
    p: string
    m: string
  }[]
  animeTitle: string
  episodeTitle?: string
  episodeNumber?: number
}

export interface CustomDanmakuParsedData {
  comments: {
    p: string
    m: string
  }[]
  animeTitle?: string
  episodeTitle?: string
  episodeNumber?: number
}
