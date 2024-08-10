import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'

/**
 * Danmaku cache is always created by the background script,
 * we don't need to differentiate between request and response types since it's always a response.
 * The only exception is when we're importing danmaku from a file,
 * in which case we assume the file is exported from the extension and has the correct schema,
 * and we can import it without modification.
 */
export interface BaseDanmakuEntity {
  comments: CommentEntity[]
  // How many times the comments have been updated
  version: number
  // The last time the comments were updated
  timeUpdated: number
}
