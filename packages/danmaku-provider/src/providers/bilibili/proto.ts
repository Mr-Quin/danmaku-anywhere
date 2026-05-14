import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { bilibili as bilibiliProto } from '../../protobuf/protobuf.js'
import { zBilibiliCommentProto } from './schema.js'

export async function decodeBilibiliDanmakuProto(
  bytes: Uint8Array
): Promise<CommentEntity[]> {
  const decoded =
    bilibiliProto.community.service.dm.v1.DmSegMobileReply.decode(bytes)
  const parsed = await zBilibiliCommentProto.parseAsync(decoded)
  return parsed.elems
}
