import {
  type CommentEntity,
  CommentMode,
  hexToRgb888,
} from '@danmaku-anywhere/danmaku-converter'

export class TencentMapper {
  static manifestBarrageToComments(
    items: ManifestBarrageItem[]
  ): CommentEntity[] {
    const out: CommentEntity[] = new Array(items.length)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      out[i] = {
        p: `${Number(item.time_offset) / 1000},${CommentMode.rtl},${parseTencentBarrageColor(item.content_style)}`,
        m: item.content,
      }
    }
    return out
  }
}

interface ManifestBarrageItem {
  id: string
  content: string
  time_offset: string | number
  content_style?: string
}

function parseTencentBarrageColor(style: string | undefined): number {
  if (!style) {
    return hexToRgb888('#ffffff')
  }
  try {
    const parsed = JSON.parse(style) as {
      color?: string
      gradient_colors?: [string, string]
    }
    const hex = parsed.gradient_colors?.[0] ?? parsed.color
    return hexToRgb888(hex ? `#${hex}` : '#ffffff')
  } catch {
    return hexToRgb888('#ffffff')
  }
}
