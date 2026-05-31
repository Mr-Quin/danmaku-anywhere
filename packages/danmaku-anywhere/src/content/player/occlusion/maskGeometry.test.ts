import { describe, expect, it } from 'vitest'
import { buildAlphaMask, computeContainRect } from './maskGeometry'

/**
 * Exercises the pure geometry behind the occlusion CSS alpha mask.
 * Verifies computeContainRect for wider-than-box (letterbox bars), taller-than-box
 * (pillarbox bars), and exact-aspect (no bars) cases against hand-computed rects.
 * Verifies buildAlphaMask polarity (person -> alpha 0, background -> alpha 255),
 * that letterbox bars are opaque, and that a downscaled outputScale produces a
 * smaller RGBA buffer that still maps box pixels into the decoded frame.
 */

function alphaAt(
  mask: { data: Uint8ClampedArray; width: number },
  x: number,
  y: number
): number {
  return mask.data[(y * mask.width + x) * 4 + 3]
}

describe('computeContainRect', () => {
  it('letterboxes a wider-than-box frame with top/bottom bars', () => {
    expect(
      computeContainRect(
        { width: 400, height: 100 },
        { width: 200, height: 200 }
      )
    ).toEqual({
      x: 0,
      y: 75,
      width: 200,
      height: 50,
    })
  })

  it('pillarboxes a taller-than-box frame with left/right bars', () => {
    expect(
      computeContainRect(
        { width: 100, height: 400 },
        { width: 200, height: 200 }
      )
    ).toEqual({
      x: 75,
      y: 0,
      width: 50,
      height: 200,
    })
  })

  it('fills the box with no bars when aspect matches', () => {
    expect(
      computeContainRect(
        { width: 320, height: 180 },
        { width: 640, height: 360 }
      )
    ).toEqual({
      x: 0,
      y: 0,
      width: 640,
      height: 360,
    })
  })
})

describe('buildAlphaMask', () => {
  it('hides danmaku over person pixels and shows it over background', () => {
    const category = new Uint8Array([1, 0, 0, 0])
    const mask = buildAlphaMask({
      category,
      maskSize: { width: 2, height: 2 },
      box: { width: 2, height: 2 },
      isPerson: (v) => v === 1,
    })

    expect(mask.width).toBe(2)
    expect(mask.height).toBe(2)
    expect(alphaAt(mask, 0, 0)).toBe(0)
    expect(alphaAt(mask, 1, 0)).toBe(255)
    expect(alphaAt(mask, 0, 1)).toBe(255)
    expect(alphaAt(mask, 1, 1)).toBe(255)
  })

  it('keeps rgb white for every pixel', () => {
    const category = new Uint8Array([1, 0, 0, 0])
    const mask = buildAlphaMask({
      category,
      maskSize: { width: 2, height: 2 },
      box: { width: 2, height: 2 },
      isPerson: (v) => v === 1,
    })

    for (let i = 0; i < mask.data.length; i += 4) {
      expect(mask.data[i]).toBe(255)
      expect(mask.data[i + 1]).toBe(255)
      expect(mask.data[i + 2]).toBe(255)
    }
  })

  it('makes letterbox bars opaque even when the frame is all person', () => {
    const category = new Uint8Array([1, 1])
    const mask = buildAlphaMask({
      category,
      maskSize: { width: 2, height: 1 },
      box: { width: 4, height: 4 },
      isPerson: () => true,
    })

    expect(alphaAt(mask, 0, 0)).toBe(255)
    expect(alphaAt(mask, 2, 0)).toBe(255)
    expect(alphaAt(mask, 0, 3)).toBe(255)
    expect(alphaAt(mask, 2, 3)).toBe(255)

    expect(alphaAt(mask, 0, 1)).toBe(0)
    expect(alphaAt(mask, 3, 1)).toBe(0)
  })

  it('makes pillarbox bars opaque even when the frame is all person', () => {
    const category = new Uint8Array([1, 1])
    const mask = buildAlphaMask({
      category,
      maskSize: { width: 1, height: 2 },
      box: { width: 4, height: 4 },
      isPerson: () => true,
    })

    expect(alphaAt(mask, 0, 0)).toBe(255)
    expect(alphaAt(mask, 3, 0)).toBe(255)

    expect(alphaAt(mask, 1, 0)).toBe(0)
    expect(alphaAt(mask, 2, 0)).toBe(0)
  })

  it('produces a downscaled buffer that still maps into the frame', () => {
    const category = new Uint8Array([1, 1, 1, 1])
    const mask = buildAlphaMask({
      category,
      maskSize: { width: 2, height: 2 },
      box: { width: 4, height: 4 },
      isPerson: () => true,
      outputScale: 0.5,
    })

    expect(mask.width).toBe(2)
    expect(mask.height).toBe(2)
    expect(alphaAt(mask, 0, 0)).toBe(0)
    expect(alphaAt(mask, 1, 0)).toBe(0)
    expect(alphaAt(mask, 0, 1)).toBe(0)
    expect(alphaAt(mask, 1, 1)).toBe(0)
  })
})
