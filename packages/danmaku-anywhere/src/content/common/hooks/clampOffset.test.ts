import { describe, expect, it } from 'vitest'
import { clampOffset, type OffsetBounds } from './clampOffset'

/**
 * Exercises the offset-clamping helper used by the FAB and info-panel
 * position hooks. Verifies that absent bounds pass through unchanged
 * and that finite bounds clamp the offset on both axes independently.
 */
describe('clampOffset', () => {
  const bounds: OffsetBounds = { minX: -10, maxX: 100, minY: -20, maxY: 200 }

  it('returns the original offset when bounds are undefined', () => {
    const offset = { x: 9999, y: -9999 }
    expect(clampOffset(offset, undefined)).toEqual(offset)
  })

  it('clamps offset above the upper bound on both axes', () => {
    expect(clampOffset({ x: 500, y: 500 }, bounds)).toEqual({
      x: 100,
      y: 200,
    })
  })

  it('clamps offset below the lower bound on both axes', () => {
    expect(clampOffset({ x: -500, y: -500 }, bounds)).toEqual({
      x: -10,
      y: -20,
    })
  })

  it('leaves offsets that already fit the bounds untouched', () => {
    expect(clampOffset({ x: 42, y: 17 }, bounds)).toEqual({ x: 42, y: 17 })
  })

  it('clamps each axis independently', () => {
    expect(clampOffset({ x: 500, y: 17 }, bounds)).toEqual({ x: 100, y: 17 })
    expect(clampOffset({ x: 42, y: -500 }, bounds)).toEqual({ x: 42, y: -20 })
  })
})
