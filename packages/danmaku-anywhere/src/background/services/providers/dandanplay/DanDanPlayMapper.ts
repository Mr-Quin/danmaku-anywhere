import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'

export class DanDanPlayMapper {
  static manifestCommentsToComments(
    items: ManifestDdpComment[]
  ): CommentEntity[] {
    const out: CommentEntity[] = new Array(items.length)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      out[i] = { cid: item.cid, p: item.p, m: item.m }
    }
    return out
  }
}

interface ManifestDdpComment {
  cid: number
  p: string
  m: string
}
