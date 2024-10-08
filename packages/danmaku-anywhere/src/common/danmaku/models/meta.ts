import type { BiliBiliMediaType } from '@danmaku-anywhere/danmaku-provider/bilibili'

import type { DanmakuSourceType } from '@/common/danmaku/enums'

/**
 * Meta contains the information needed to fetch the danmaku from their provider
 */
interface BaseDanmakuMeta {
  provider: DanmakuSourceType
}

export interface DanDanPlayMeta extends BaseDanmakuMeta {
  provider: DanmakuSourceType.DanDanPlay
  /**
   * All properties come from DDP API
   */
  episodeId: number
  animeId: number
  episodeTitle: string
  animeTitle: string
}

// episode title is undefined when episodeId is computed from the episode number
export type DanDanPlayMetaComputed = Omit<DanDanPlayMeta, 'episodeTitle'> & {
  episodeTitle?: string
}

export type DanDanPlayMetaDto = DanDanPlayMeta | DanDanPlayMetaComputed

export interface BiliBiliMeta extends BaseDanmakuMeta {
  provider: DanmakuSourceType.Bilibili
  /**
   * All properties come from Bilibili API
   */
  // cid
  cid: number

  // submission id
  bvid?: string
  aid: number

  // season id
  seasonId: number

  title: string
  seasonTitle: string
  mediaType: BiliBiliMediaType
}

export interface TencentMeta extends BaseDanmakuMeta {
  provider: DanmakuSourceType.Tencent
  cid: string // season id
  vid: string // episode id
  episodeTitle: string
  seasonTitle: string
}

export interface CustomMeta extends BaseDanmakuMeta {
  provider: DanmakuSourceType.Custom
  seasonTitle: string
  episodeTitle: string
}

export type DanmakuMetaExternal = DanDanPlayMeta | BiliBiliMeta | TencentMeta

export type DanmakuMeta = DanmakuMetaExternal | CustomMeta
