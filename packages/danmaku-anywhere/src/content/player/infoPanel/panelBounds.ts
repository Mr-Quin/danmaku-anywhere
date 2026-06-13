import {
  clampOffset,
  type OffsetBounds,
} from '@/content/common/hooks/clampOffset'
import type { DragOffset } from '@/content/controller/ui/components/dragOffset'

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

/**
 * The fraction of the parent where the panel's center sits. Storing the center
 * fraction (rather than a pixel offset) keeps the panel proportionally placed
 * across resizes: centered stays centered when the video goes fullscreen.
 */
export function offsetToFraction(
  offset: DragOffset,
  parent: Size,
  panel: Size
): DragOffset {
  return {
    x: parent.width > 0 ? (offset.x + panel.width / 2) / parent.width : 0.5,
    y: parent.height > 0 ? (offset.y + panel.height / 2) / parent.height : 0.5,
  }
}

/** Inverse of offsetToFraction, clamped to keep the panel fully in view. */
export function fractionToOffset(
  fraction: DragOffset,
  parent: Size,
  panel: Size
): DragOffset {
  return clampOffset(
    {
      x: fraction.x * parent.width - panel.width / 2,
      y: fraction.y * parent.height - panel.height / 2,
    },
    computePanelBounds(parent, panel)
  )
}
