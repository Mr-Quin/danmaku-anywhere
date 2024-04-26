import type {
  DanDanComment,
  DanDanCommentAPIParams,
} from '@danmaku-anywhere/dandanplay-api'

import type { DanmakuFetchOptions } from './DanmakuFetchOptions'

export enum DanmakuType {
  Manual,
  DDP,
}

interface BaseDanmakuMeta {
  type: DanmakuType
}

export interface DDPDanmakuMeta extends BaseDanmakuMeta {
  episodeId: number
  animeId: number
  episodeTitle?: string
  animeTitle: string
  type: DanmakuType.DDP
}

export interface ManualDanmakuMeta extends BaseDanmakuMeta {
  episodeId: number
  animeTitle: string
  episodeTitle?: string
  type: DanmakuType.Manual
}

export type DanmakuMeta = DDPDanmakuMeta | ManualDanmakuMeta

interface BaseDanmakuCache {
  comments: DanDanComment[]
  count: number
  version: number
  timeUpdated: number
}

export interface DDPDanmakuCache extends BaseDanmakuCache {
  meta: DDPDanmakuMeta
  /**
   * The params used to fetch the comments
   */
  params: Partial<DanDanCommentAPIParams>
}

export interface ManualDanmakuCache extends BaseDanmakuCache {
  meta: ManualDanmakuMeta
}

export type DanmakuCache = DDPDanmakuCache | ManualDanmakuCache

/**
 * A lite version of DanmakuCache, only contains count and meta
 * To reduce the size of the cache for cases where comments are not needed
 */
export type DanmakuCacheLite = Pick<DanmakuCache, 'count' | 'meta'> & {
  type: DanmakuType
}

export interface DanmakuGetOneDto {
  type: DanmakuType
  id: number
}

export interface DanmakuFetchDDPDto {
  meta: DDPDanmakuMeta
  params?: Partial<DanDanCommentAPIParams>
  options?: DanmakuFetchOptions
}

export interface DanmakuDeleteDto {
  type: DanmakuType
  id: number
}

export interface TitleMapping {
  originalTitle: string
  title: string
  source: string
  animeId: number
}
