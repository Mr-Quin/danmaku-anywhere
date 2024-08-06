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

// The model used to insert into the database, episodeId is auto generated so is omitted
export type CustomDanmakuCacheDbModelInsert = BaseDanmakuCache & {
  meta: Omit<CustomDanmakuMeta, 'episodeId'>
}

export type CustomDanmakuCacheDbModel = BaseDanmakuCache & {
  meta: CustomDanmakuMeta
}

// Capture the type of the model that is stored in the database
export type DanmakuCacheDbModel =
  | DDPDanmakuCacheDbModel
  | CustomDanmakuCacheDbModel

// Capture the type of the model that can be inserted into the database
export type DanmakuCacheDbModelInsert =
  | DDPDanmakuCacheDbModel
  | CustomDanmakuCacheDbModelInsert
