import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  CustomDanmakuCacheDbModel,
  CustomDanmakuCacheDbModelInsert,
  DDPDanmakuCacheDbModel,
} from '@/common/danmaku/models/danmakuCache/db'

export type DDPDanmakuCache = DDPDanmakuCacheDbModel & {
  type: DanmakuSourceType.DDP
  count: number
}

export type CustomDanmakuCache = CustomDanmakuCacheDbModel & {
  type: DanmakuSourceType.Custom
  count: number
}

export type DanmakuCache = DDPDanmakuCache | CustomDanmakuCache

export type DDPDanmakuCacheImportDto = DDPDanmakuCacheDbModel & {
  type: DanmakuSourceType.DDP
}

export type CustomDanmakuCacheImportDto = CustomDanmakuCacheDbModelInsert & {
  type: DanmakuSourceType.Custom
}

export type DanmakuCacheImportDto =
  | DDPDanmakuCacheImportDto
  | CustomDanmakuCacheImportDto

/**
 * A lite version of DanmakuCache, only contains count and meta
 * To reduce the size of the cache for cases where comments are not needed
 */
export type DanmakuCacheLite = Pick<DanmakuCache, 'meta' | 'type'> & {
  // The count of comments
  count: number
}

export interface CustomDanmakuCreateDto {
  comments: {
    p: string
    m: string
  }[]
  animeTitle: string
  episodeTitle?: string
  episodeNumber?: number
}

export interface CustomDanmakuParsed {
  comments: {
    p: string
    m: string
  }[]
  animeTitle?: string
  episodeTitle?: string
  episodeNumber?: number
}
