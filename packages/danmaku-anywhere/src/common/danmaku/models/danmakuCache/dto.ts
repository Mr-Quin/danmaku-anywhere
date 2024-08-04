import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  CustomDanmakuCacheDbModel,
  DDPDanmakuCacheDbModel,
} from '@/common/danmaku/models/danmakuCache/db'

export type DDPDanmakuCache = DDPDanmakuCacheDbModel & {
  type: DanmakuSourceType.DDP
}

export type CustomDanmakuCache = CustomDanmakuCacheDbModel & {
  type: DanmakuSourceType.Custom
}

export type DanmakuCache = DDPDanmakuCache | CustomDanmakuCache

/**
 * A lite version of DanmakuCache, only contains count and meta
 * To reduce the size of the cache for cases where comments are not needed
 */
export type DanmakuCacheLite = Pick<DanmakuCache, 'count' | 'meta' | 'type'>
