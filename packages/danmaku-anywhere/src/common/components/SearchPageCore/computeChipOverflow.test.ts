import { describe, expect, it } from 'vitest'
import { computeChipOverflow } from './computeChipOverflow'

/**
 * Verifies the priority-plus chip layout: everything visible when it fits,
 * collapse trailing chips behind an overflow slot when it doesn't, and swap
 * the active chip into the last visible slot when it would otherwise be hidden.
 * Also covers the pre-measurement state where widths are not yet known.
 */

const item = (id: string) => ({ id })
const items = ['a', 'b', 'c', 'd', 'e'].map(item)
const uniformWidths = { a: 50, b: 50, c: 50, d: 50, e: 50 }

const ids = (list: { id: string }[]) => list.map((entry) => entry.id)

describe('computeChipOverflow', () => {
  it('shows everything when all chips fit', () => {
    const layout = computeChipOverflow({
      items,
      activeId: 'a',
      widths: uniformWidths,
      containerWidth: 1000,
      overflowWidth: 30,
      gap: 6,
    })
    expect(ids(layout.visible)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(layout.overflow).toEqual([])
  })

  it('shows everything before widths are measured', () => {
    const layout = computeChipOverflow({
      items,
      activeId: 'a',
      widths: {},
      containerWidth: 100,
      overflowWidth: 30,
      gap: 6,
    })
    expect(ids(layout.visible)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(layout.overflow).toEqual([])
  })

  it('collapses trailing chips behind the overflow slot when active fits', () => {
    const layout = computeChipOverflow({
      items,
      activeId: 'a',
      widths: uniformWidths,
      containerWidth: 150,
      overflowWidth: 30,
      gap: 6,
    })
    expect(ids(layout.visible)).toEqual(['a', 'b'])
    expect(ids(layout.overflow)).toEqual(['c', 'd', 'e'])
  })

  it('swaps the active chip into the last visible slot when it overflows', () => {
    const layout = computeChipOverflow({
      items,
      activeId: 'e',
      widths: uniformWidths,
      containerWidth: 150,
      overflowWidth: 30,
      gap: 6,
    })
    expect(ids(layout.visible)).toEqual(['a', 'e'])
    expect(ids(layout.overflow)).toEqual(['b', 'c', 'd'])
  })

  it('falls back to natural layout when activeId is not in items', () => {
    const layout = computeChipOverflow({
      items,
      activeId: 'non-existent',
      widths: uniformWidths,
      containerWidth: 150,
      overflowWidth: 30,
      gap: 6,
    })
    expect(ids(layout.visible)).toEqual(['a', 'b'])
    expect(ids(layout.overflow)).toEqual(['c', 'd', 'e'])
  })

  it('returns empty layout for no items', () => {
    const layout = computeChipOverflow({
      items: [],
      activeId: '',
      widths: {},
      containerWidth: 100,
      overflowWidth: 30,
      gap: 6,
    })
    expect(layout.visible).toEqual([])
    expect(layout.overflow).toEqual([])
  })
})
