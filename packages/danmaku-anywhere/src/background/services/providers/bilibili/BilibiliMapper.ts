import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'

export class BilibiliMapper {
  static manifestSegmentsToComments(
    items: ManifestBilibiliDanmakuElem[]
  ): CommentEntity[] {
    const out: CommentEntity[] = new Array(items.length)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const mode = item.mode === 2 || item.mode === 3 ? 1 : item.mode
      out[i] = {
        p: `${Number(item.progress) / 1000},${mode},${item.color},${item.midHash ?? ''}`,
        m: item.content,
      }
    }
    return out
  }
}

interface ManifestBilibiliDanmakuElem {
  progress: number
  mode: number
  color: number
  midHash?: string
  content: string
}
