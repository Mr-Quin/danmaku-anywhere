import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'

import type { DanmakuSourceType } from '@/common/danmaku/enums'

/**
 * Danmaku cache is always created by the background script,
 * we don't need to differentiate between request and response types since it's always a response.
 * The only exception is when we're importing danmaku from a file,
 * in which case we assume the file is exported from the extension and has the correct schema,
 * and we can import it without modification.
 */
export interface BaseDanmakuEntity {
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
  episodeId?: number
  episodeTitle: string
  // Season id, used for grouping episodes, can be undefined for some providers
  seasonId?: number
  seasonTitle: string

  // Auto generated id
  id: number
}
