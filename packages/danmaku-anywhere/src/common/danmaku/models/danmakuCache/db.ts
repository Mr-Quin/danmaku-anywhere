import type { DanDanCommentAPIParams } from '@danmaku-anywhere/dandanplay-api'

import type { BaseDanmakuCache } from '@/common/danmaku/models/danmakuCache/base'
import type {
  CustomDanmakuMeta,
  DDPDanmakuMeta,
} from '@/common/danmaku/models/danmakuMeta'

export type DDPDanmakuCacheDbModel = BaseDanmakuCache & {
  meta: DDPDanmakuMeta
  /**
   * The params used to fetch the comments
   */
  params: Partial<DanDanCommentAPIParams>
}

export type CustomDanmakuCacheDbModel = BaseDanmakuCache & {
  meta: CustomDanmakuMeta
}

export type DanmakuCacheDbModel =
  | DDPDanmakuCacheDbModel
  | CustomDanmakuCacheDbModel
