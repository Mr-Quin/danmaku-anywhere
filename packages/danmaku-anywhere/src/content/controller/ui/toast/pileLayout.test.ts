import { describe, expect, it } from 'vitest'
import {
  layoutPile,
  PILE_GAP_PX,
  PILE_MAX_VISIBLE,
  PILE_PEEK_PX,
} from './pileLayout'

/**
 * layoutPile places in-page toasts. Collapsed, the newest toast sits in front
 * and older ones peek out above it at its height, so the pile stays one toast
 * tall plus the peek. Expanded, every toast gets its own row. Toasts past the
 * cap are hidden, and reduced motion drops the scaling.
 */

describe('layoutPile', () => {
  it('keeps a collapsed pile one toast tall plus the peek', () => {
    const { items, height } = layoutPile({
      heights: [48, 64, 48],
      expanded: false,
      reducedMotion: false,
    })

    expect(height).toBe(48 + 2 * PILE_PEEK_PX)
    expect(items.map((i) => i.y)).toEqual([0, PILE_PEEK_PX, 2 * PILE_PEEK_PX])
    expect(items[1].height).toBe(48)
    expect(items[1].scale).toBeLessThan(1)
    expect(items.map((i) => i.contentVisible)).toEqual([true, false, false])
    expect(items[0].zIndex).toBeGreaterThan(items[1].zIndex)
  })

  it('gives every toast a row when expanded', () => {
    const { items, height } = layoutPile({
      heights: [48, 64, 48],
      expanded: true,
      reducedMotion: false,
    })

    expect(items.map((i) => i.y)).toEqual([
      0,
      48 + PILE_GAP_PX,
      48 + 64 + 2 * PILE_GAP_PX,
    ])
    expect(height).toBe(48 + 64 + 48 + 2 * PILE_GAP_PX)
    expect(items.every((i) => i.contentVisible && i.scale === 1)).toBe(true)
  })

  it('hides toasts past the cap and leaves them out of the height', () => {
    const heights = Array.from({ length: PILE_MAX_VISIBLE + 2 }, () => 48)
    const collapsed = layoutPile({
      heights,
      expanded: false,
      reducedMotion: false,
    })

    expect(collapsed.items.filter((i) => i.visible)).toHaveLength(
      PILE_MAX_VISIBLE
    )
    expect(collapsed.height).toBe(48 + (PILE_MAX_VISIBLE - 1) * PILE_PEEK_PX)
  })

  it('does not scale with reduced motion', () => {
    const { items } = layoutPile({
      heights: [48, 48],
      expanded: false,
      reducedMotion: true,
    })

    expect(items.map((i) => i.scale)).toEqual([1, 1])
  })
})
