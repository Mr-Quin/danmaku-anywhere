import type { DanDanCommentAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'

import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { BaseDanmakuEntity } from '@/common/danmaku/models/entity/base'
import type {
  BiliBiliMeta,
  CustomMeta,
  DanDanPlayMeta,
} from '@/common/danmaku/models/meta'

export type DanDanPlayDanmaku = BaseDanmakuEntity & {
  provider: DanmakuSourceType.DDP
  meta: DanDanPlayMeta
  /**
   * The params used to fetch the comments
   */
  params: Partial<DanDanCommentAPIParams>
}

export type DanDanPlayDanmakuInsert = Omit<DanDanPlayDanmaku, 'id'>

export type CustomDanmaku = BaseDanmakuEntity & {
  provider: DanmakuSourceType.Custom
  meta: CustomMeta
}

// The model used to insert into the database, episodeId is auto generated so is omitted
export type CustomDanmakuInsert = Omit<CustomDanmaku, 'id'>

export type BiliBiliDanmaku = BaseDanmakuEntity & {
  provider: DanmakuSourceType.Bilibili
  meta: BiliBiliMeta
}

export type BiliBiliDanmakuInsert = Omit<BiliBiliDanmaku, 'id'>

// Capture the type of the model that is stored in the database
export type Danmaku = DanDanPlayDanmaku | CustomDanmaku | BiliBiliDanmaku

// Capture the type of the model that can be inserted into the database
export type DanmakuInsert =
  | DanDanPlayDanmakuInsert
  | CustomDanmakuInsert
  | BiliBiliDanmakuInsert

export type DanmakuLite =
  | Omit<DanDanPlayDanmaku, 'comments'>
  | Omit<CustomDanmaku, 'comments'>
  | Omit<BiliBiliDanmaku, 'comments'>
