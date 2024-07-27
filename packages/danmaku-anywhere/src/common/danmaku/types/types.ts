import type { DanDanCommentAPIParams } from '@danmaku-anywhere/dandanplay-api'
import type { CachedComment } from '@danmaku-anywhere/danmaku-engine'

import type {
  DanmakuSourceType,
  IntegrationType,
} from '@/common/danmaku/types/enums'

interface BaseDanmakuMeta {
  type: DanmakuSourceType
}

export interface DDPDanmakuMeta extends BaseDanmakuMeta {
  type: DanmakuSourceType.DDP
  /**
   * All properties come from DDP API
   */
  episodeId: number
  animeId: number
  episodeTitle?: string
  animeTitle: string
}

export interface CustomDanmakuMeta extends BaseDanmakuMeta {
  type: DanmakuSourceType.Custom
  /**
   * Auto generated id for custom danmaku
   */
  episodeId: number
  animeTitle: string
  /**
   * One of episodeTitle or episodeNumber is required
   */
  episodeTitle?: string
  episodeNumber?: number
}

export type DanmakuMeta = DDPDanmakuMeta | CustomDanmakuMeta

interface BaseDanmakuCache {
  comments: CachedComment[]
  count: number
  version: number
  timeUpdated: number
}

export type DDPDanmakuCache = BaseDanmakuCache & {
  meta: DDPDanmakuMeta
  /**
   * The params used to fetch the comments
   */
  params: Partial<DanDanCommentAPIParams>
}

export type CustomDanmakuCache = BaseDanmakuCache & {
  meta: CustomDanmakuMeta
}

export type DanmakuCache = DDPDanmakuCache | CustomDanmakuCache

/**
 * A lite version of DanmakuCache, only contains count and meta
 * To reduce the size of the cache for cases where comments are not needed
 */
export type DanmakuCacheLite = Pick<DanmakuCache, 'count' | 'meta'> & {
  type: DanmakuSourceType
}

export interface DanmakuFetchOptions {
  forceUpdate?: boolean // force update danmaku from server even if it's already in db
}

export interface TitleMapping {
  originalTitle: string
  title: string
  /**
   * @deprecated
   * Use source to identify the source of the title mapping, replaced by integration
   */
  source?: string
  integration: IntegrationType
  animeId: number
}
