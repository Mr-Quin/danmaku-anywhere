export const PILE_PEEK_PX = 8
export const PILE_GAP_PX = 8
export const PILE_MAX_VISIBLE = 4
const SCALE_STEP = 0.05

export interface PileItemLayout {
  // Upward offset from the bottom of the pile
  y: number
  scale: number
  visible: boolean
  contentVisible: boolean
  // Set when a toast behind the front one is cut to the front toast's height
  height?: number
  zIndex: number
}

export interface PileLayout {
  items: PileItemLayout[]
  height: number
}

interface PileLayoutInput {
  // Newest first, so index 0 is the toast in front
  heights: number[]
  expanded: boolean
  reducedMotion: boolean
}

export function layoutPile({
  heights,
  expanded,
  reducedMotion,
}: PileLayoutInput): PileLayout {
  const count = Math.min(heights.length, PILE_MAX_VISIBLE)
  if (count === 0) {
    return { items: [], height: 0 }
  }

  if (expanded) {
    let offset = 0
    const items = heights.map((height, i) => {
      const item: PileItemLayout = {
        y: offset,
        scale: 1,
        visible: i < PILE_MAX_VISIBLE,
        contentVisible: true,
        zIndex: heights.length - i,
      }
      offset += height + PILE_GAP_PX
      return item
    })
    const visibleHeights = heights.slice(0, count)
    const height =
      visibleHeights.reduce((sum, h) => sum + h, 0) + PILE_GAP_PX * (count - 1)
    return { items, height }
  }

  const front = heights[0]
  const items = heights.map((_, i) => {
    return {
      y: i * PILE_PEEK_PX,
      scale: reducedMotion ? 1 : 1 - i * SCALE_STEP,
      visible: i < PILE_MAX_VISIBLE,
      contentVisible: i === 0,
      height: i === 0 ? undefined : front,
      zIndex: heights.length - i,
    }
  })
  return { items, height: front + PILE_PEEK_PX * (count - 1) }
}
