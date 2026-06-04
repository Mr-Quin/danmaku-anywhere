import type { OffsetBounds } from '@/content/common/hooks/clampOffset'

export interface Size {
  width: number
  height: number
}

/**
 * Offset bounds that keep a panel of `panel` size fully inside a `parent` box
 * (the video-aligned wrapper). Offsets are measured from the parent's top-left.
 */
export function computePanelBounds(parent: Size, panel: Size): OffsetBounds {
  return {
    minX: 0,
    minY: 0,
    maxX: Math.max(0, parent.width - panel.width),
    maxY: Math.max(0, parent.height - panel.height),
  }
}
