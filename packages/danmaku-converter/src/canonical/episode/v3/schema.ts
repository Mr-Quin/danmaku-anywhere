import type { BiliBiliMediaType } from '../../../utils/index.js'
import type { CommentEntity } from '../../comment/index.js'
import type { DanmakuSourceType } from '../../provider/provider.js'

/**
 * Meta contains the information needed to fetch the danmaku from their provider
 */
interface BaseDanmakuMeta {
  provider: DanmakuSourceType
}

/**
 * @deprecated
 */
interface DanDanPlayMeta extends BaseDanmakuMeta {
  provider: DanmakuSourceType.DanDanPlay
  /**
   * All properties come from DDP API
   */
  episodeId: number
  animeId: number
  episodeTitle: string
  animeTitle: string
}

/**
 * @deprecated
 */
interface BiliBiliMeta extends BaseDanmakuMeta {
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

/**
 * @deprecated
 */
interface TencentMeta extends BaseDanmakuMeta {
  provider: DanmakuSourceType.Tencent
  cid: string // season id
  vid: string // episode id
  episodeTitle: string
  seasonTitle: string
}

/**
 * @deprecated
 */
interface CustomMeta extends BaseDanmakuMeta {
  provider: DanmakuSourceType.Custom
  seasonTitle: string
  episodeTitle: string
}

/**
 * Danmaku cache is always created by the background script,
 * we don't need to differentiate between request and response types since it's always a response.
 * The only exception is when we're importing danmaku from a file,
 * in which case we assume the file is exported from the extension and has the correct schema,
 * and we can import it without modification.
 *
 * @deprecated
 */
interface BaseEpisodeV3 {
  // The source of the danmaku
  provider: DanmakuSourceType
  comments: CommentEntity[]
  commentCount: number
  // How many times the comments have been updated
  version: number
  // The last time the comments were updated
  timeUpdated: number
  schemaVersion: 1 | 2 | 3

  // Identifier for the episode, varies between providers
  episodeId?: number | string
  episodeTitle: string
  // Season id, used for grouping episodes, can be undefined for some providers
  seasonId?: number | string
  seasonTitle: string

  // Auto generated id
  id: number
}

/**
 * @deprecated
 */
export type DanDanPlayDanmakuV3 = BaseEpisodeV3 & {
  provider: DanmakuSourceType.DanDanPlay
  meta: DanDanPlayMeta
  /**
   * The params used to fetch the comments
   * omitted here since we don't want to import these params
   */
  params: Partial<{}>
}

/**
 * @deprecated
 */
export type DanDanPlayDanmakuInsertV3 = Omit<DanDanPlayDanmakuV3, 'id'>

/**
 * @deprecated
 */
export type CustomDanmakuV3 = BaseEpisodeV3 & {
  provider: DanmakuSourceType.Custom
  meta: CustomMeta
}

/**
 * The model used to insert into the database, episodeId is auto generated so is omitted
 * @deprecated
 */
export type CustomDanmakuInsertV3 = Omit<CustomDanmakuV3, 'id'>

/**
 * @deprecated
 */
export type BiliBiliDanmakuV3 = BaseEpisodeV3 & {
  provider: DanmakuSourceType.Bilibili
  meta: BiliBiliMeta
}

/**
 * @deprecated
 */
export type BiliBiliDanmakuInsertV3 = Omit<BiliBiliDanmakuV3, 'id'>

/**
 * @deprecated
 */
export type TencentDanmakuV3 = BaseEpisodeV3 & {
  provider: DanmakuSourceType.Tencent
  meta: TencentMeta
}

/**
 * @deprecated
 */
export type TencentDanmakuInsertV3 = Omit<TencentDanmakuV3, 'id'>

/**
 * Capture the type of the model that is stored in the database
 *
 * @deprecated
 */
export type DanmakuV3 =
  | DanDanPlayDanmakuV3
  | CustomDanmakuV3
  | BiliBiliDanmakuV3
  | TencentDanmakuV3

/**
 * Capture the type of the model that can be inserted into the database
 *
 * @deprecated
 */
export type DanmakuInsertV3 =
  | DanDanPlayDanmakuInsertV3
  | CustomDanmakuInsertV3
  | BiliBiliDanmakuInsertV3
  | TencentDanmakuInsertV3

/**
 * @deprecated
 */
export type DanmakuLiteV3 =
  | Omit<DanDanPlayDanmakuV3, 'comments'>
  | Omit<CustomDanmakuV3, 'comments'>
  | Omit<BiliBiliDanmakuV3, 'comments'>
  | Omit<TencentDanmakuV3, 'comments'>
