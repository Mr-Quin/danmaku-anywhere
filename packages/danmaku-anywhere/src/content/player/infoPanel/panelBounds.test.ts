import { describe, expect, it } from 'vitest'
import { computePanelBounds } from './panelBounds'

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
