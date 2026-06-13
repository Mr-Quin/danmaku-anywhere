import type { DragOffset } from '@/content/controller/ui/components/dragOffset'

export interface OffsetBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export function clampOffset(
  offset: DragOffset,
  bounds: OffsetBounds | undefined
): DragOffset {
  if (!bounds) {
    return offset
  }
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, offset.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, offset.y)),
  }
}
