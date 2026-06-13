import { describe, expect, it } from 'vitest'
import {
  computePanelBounds,
  fractionToOffset,
  offsetToFraction,
} from './panelBounds'

describe('computePanelBounds', () => {
  it('allows the panel to move within the remaining space', () => {
    expect(
      computePanelBounds(
        { width: 640, height: 360 },
        { width: 100, height: 60 }
      )
    ).toEqual({ minX: 0, minY: 0, maxX: 540, maxY: 300 })
  })

  it('clamps max to zero when the panel is larger than the parent', () => {
    expect(
      computePanelBounds({ width: 80, height: 40 }, { width: 100, height: 60 })
    ).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })
})

describe('fraction round-trip', () => {
  const parent = { width: 640, height: 360 }
  const panel = { width: 100, height: 60 }

  it('reports the center fraction of an offset', () => {
    expect(offsetToFraction({ x: 270, y: 150 }, parent, panel)).toEqual({
      x: 0.5,
      y: 0.5,
    })
  })

  it('inverts back to the same offset', () => {
    const fraction = offsetToFraction({ x: 220, y: 90 }, parent, panel)
    expect(fractionToOffset(fraction, parent, panel)).toEqual({ x: 220, y: 90 })
  })

  it('keeps a centered panel centered when the parent grows', () => {
    const centered = offsetToFraction(
      { x: (parent.width - panel.width) / 2, y: 0 },
      parent,
      panel
    )
    const larger = { width: 1280, height: 720 }
    expect(fractionToOffset(centered, larger, panel).x).toBe(
      (larger.width - panel.width) / 2
    )
  })

  it('clamps a fraction that would push the panel out of view', () => {
    expect(fractionToOffset({ x: 1, y: 1 }, parent, panel)).toEqual({
      x: 540,
      y: 300,
    })
  })
})
