import type { DanDanCommentAPIParams } from '@danmaku-anywhere/dandanplay-api'
import type { CachedComment } from '@danmaku-anywhere/danmaku-engine'
import type { z } from 'zod'

import type { DanmakuFetchOptions } from '../DanmakuFetchOptions'

import type { customDanmakuCreateSchema } from './schema'

export enum DanmakuType {
  Custom,
  DDP,
}

export const danmakuTypeList = Object.values(DanmakuType).filter(
  (e): e is DanmakuType => typeof e === 'number'
)

interface BaseDanmakuMeta {
  type: DanmakuType
}

export interface DDPDanmakuMeta extends BaseDanmakuMeta {
  type: DanmakuType.DDP
  /**
   * All properties come from DDP API
   */
  episodeId: number
  animeId: number
  episodeTitle?: string
  animeTitle: string
}

export interface CustomDanmakuMeta extends BaseDanmakuMeta {
  type: DanmakuType.Custom
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
  type: DanmakuType
}

export type CustomDanmakuCreateDto = z.infer<typeof customDanmakuCreateSchema>[]

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
