import type { BiliBiliMediaType } from '@danmaku-anywhere/danmaku-provider/bilibili'

import type { DanmakuSourceType } from '@/common/danmaku/enums'

interface BaseDanmakuMeta {
  provider: DanmakuSourceType
}

export interface DanDanPlayMeta extends BaseDanmakuMeta {
  provider: DanmakuSourceType.DDP
  /**
   * All properties come from DDP API
   */
  episodeId: number
  seasonId: number
  episodeTitle?: string
  seasonTitle: string
}

export interface BiliBiliMeta extends BaseDanmakuMeta {
  // provider: DanmakuSourceType.Bilibili
  /**
   * All properties come from Bilibili API
   */
  // cid
  episodeId: number
  bvid?: string
  aid: number
  title: string
  seasonTitle: string
  mediaType: BiliBiliMediaType
}

export interface CustomMeta extends BaseDanmakuMeta {
  provider: DanmakuSourceType.Custom
  seasonTitle: string
  /**
   * One of episodeTitle or episodeNumber is required
   */
  episodeTitle?: string
  episodeNumber?: number
}

export type DanmakuMeta = DanDanPlayMeta | CustomMeta
