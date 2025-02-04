import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import type { GetCommentQuery } from '@danmaku-anywhere/danmaku-provider/ddp'

import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  BiliBiliMeta,
  CustomMeta,
  DanDanPlayMeta,
  TencentMeta,
} from '@/common/danmaku/models/meta'

/**
 * Danmaku cache is always created by the background script,
 * we don't need to differentiate between request and response types since it's always a response.
 * The only exception is when we're importing danmaku from a file,
 * in which case we assume the file is exported from the extension and has the correct schema,
 * and we can import it without modification.
 */
interface BaseDanmakuEntity {
  // The source of the danmaku
  provider: DanmakuSourceType
  comments: CommentEntity[]
  commentCount: number
  // How many times the comments have been updated
  version: number
  // The last time the comments were updated
  timeUpdated: number
  schemaVersion: number

  // Identifier for the episode, varies between providers
  episodeId?: number | string
  episodeTitle: string
  // Season id, used for grouping episodes, can be undefined for some providers
  seasonId?: number | string
  seasonTitle: string

  // Auto generated id
  id: number
}

export type DanDanPlayDanmaku = BaseDanmakuEntity & {
  provider: DanmakuSourceType.DanDanPlay
  meta: DanDanPlayMeta
  /**
   * The params used to fetch the comments
   */
  params: Partial<GetCommentQuery>
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

export type TencentDanmaku = BaseDanmakuEntity & {
  provider: DanmakuSourceType.Tencent
  meta: TencentMeta
}

export type TencentDanmakuInsert = Omit<TencentDanmaku, 'id'>

// Capture the type of the model that is stored in the database
export type Danmaku =
  | DanDanPlayDanmaku
  | CustomDanmaku
  | BiliBiliDanmaku
  | TencentDanmaku

// Capture the type of the model that can be inserted into the database
export type DanmakuInsert =
  | DanDanPlayDanmakuInsert
  | CustomDanmakuInsert
  | BiliBiliDanmakuInsert
  | TencentDanmakuInsert

export type DanmakuLite =
  | Omit<DanDanPlayDanmaku, 'comments'>
  | Omit<CustomDanmaku, 'comments'>
  | Omit<BiliBiliDanmaku, 'comments'>
  | Omit<TencentDanmaku, 'comments'>
