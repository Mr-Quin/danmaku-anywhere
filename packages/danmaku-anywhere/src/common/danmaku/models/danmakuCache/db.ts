import type { DanDanCommentAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'

import type { BaseDanmakuEntity } from '@/common/danmaku/models/danmakuCache/base'
import type {
  CustomMeta,
  DanDanPlayMeta,
} from '@/common/danmaku/models/danmakuMeta'

export type DanDanPlayDanmaku = BaseDanmakuEntity & {
  meta: DanDanPlayMeta
  /**
   * The params used to fetch the comments
   */
  params: Partial<DanDanCommentAPIParams>
}

// The model used to insert into the database, episodeId is auto generated so is omitted
export type CustomDanmakuInsert = BaseDanmakuEntity & {
  meta: Omit<CustomMeta, 'episodeId'>
}

export type CustomDanmaku = BaseDanmakuEntity & {
  meta: CustomMeta
}

// Capture the type of the model that is stored in the database
export type Danmaku = DanDanPlayDanmaku | CustomDanmaku

// Capture the type of the model that can be inserted into the database
export type DanmakuInsert = DanDanPlayDanmaku | CustomDanmakuInsert
