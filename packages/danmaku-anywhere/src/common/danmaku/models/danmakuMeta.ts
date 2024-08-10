import type { BiliBiliMediaType } from '@danmaku-anywhere/danmaku-provider/bilibili'

import type { DanmakuSourceType } from '@/common/danmaku/enums'

interface BaseDanmakuMeta {
  type: DanmakuSourceType
}

export interface DanDanPlayMeta extends BaseDanmakuMeta {
  type: DanmakuSourceType.DDP
  /**
   * All properties come from DDP API
   */
  episodeId: number
  animeId: number
  episodeTitle?: string
  animeTitle: string
}

export interface BiliBiliMeta extends BaseDanmakuMeta {
  // type: DanmakuSourceType.Bilibili
  /**
   * All properties come from Bilibili API
   */
  cid: number
  bvid?: string
  aid: number
  title: string
  seasonTitle: string
  mediaType: BiliBiliMediaType
}

export interface CustomMeta extends BaseDanmakuMeta {
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

export type DanmakuMeta = DanDanPlayMeta | CustomMeta
