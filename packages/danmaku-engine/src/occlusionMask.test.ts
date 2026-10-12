import { describe, expect, it } from 'vitest'
import { occlusionMaskPlacement } from './occlusionMask'

/**
 * Placement of the whole-video occlusion mask on a danmaku container that may
 * cover only part of the video. For each area, the mask size and position must
 * put mask pixel (u, v) of the video over video pixel (u, v), which the
 * `videoOffsetOf` check below recomputes the way CSS lays out mask-position.
 */

const VIDEO = { width: 1000, height: 500 }

function parsePercents(value: string): [number, number] {
  const [a, b] = value.split(' ').map((part) => Number.parseFloat(part))
  return [a, b]
}

// Where the mask image's left/top edge lands, in video pixels, for a container
// spanning [start, end] percent of the video on one axis.
function videoOffsetOf(
  videoSize: number,
  startPercent: number,
  endPercent: number,
  sizePercent: number,
  positionPercent: number
): { imageSize: number; imageStart: number } {
  const box = (videoSize * (endPercent - startPercent)) / 100
  const boxStart = (videoSize * startPercent) / 100
  const imageSize = (box * sizePercent) / 100
  const offsetInBox = ((box - imageSize) * positionPercent) / 100
  return { imageSize, imageStart: boxStart + offsetInBox }
}

const AREAS = [
  { xStart: 0, xEnd: 100, yStart: 0, yEnd: 100 },
  { xStart: 0, xEnd: 100, yStart: 0, yEnd: 50 },
  { xStart: 0, xEnd: 100, yStart: 50, yEnd: 100 },
  { xStart: 20, xEnd: 80, yStart: 10, yEnd: 35 },
  { xStart: 75, xEnd: 100, yStart: 0, yEnd: 25 },
]

describe('occlusionMaskPlacement', () => {
  it('keeps cover-equivalent placement for the full area', () => {
    expect(
      occlusionMaskPlacement({ xStart: 0, xEnd: 100, yStart: 0, yEnd: 100 })
    ).toEqual({ size: '100% 100%', position: '0% 0%' })
  })

  it.each(AREAS)('lines the mask up with the whole video for %o', (area) => {
    const placement = occlusionMaskPlacement(area)
    const [sizeX, sizeY] = parsePercents(placement.size)
    const [posX, posY] = parsePercents(placement.position)

    const x = videoOffsetOf(VIDEO.width, area.xStart, area.xEnd, sizeX, posX)
    const y = videoOffsetOf(VIDEO.height, area.yStart, area.yEnd, sizeY, posY)

    expect(x.imageSize).toBeCloseTo(VIDEO.width, 1)
    expect(x.imageStart).toBeCloseTo(0, 1)
    expect(y.imageSize).toBeCloseTo(VIDEO.height, 1)
    expect(y.imageStart).toBeCloseTo(0, 1)
  })

  it('falls back to a plain fit for an empty area', () => {
    expect(
      occlusionMaskPlacement({ xStart: 40, xEnd: 40, yStart: 0, yEnd: 100 })
    ).toEqual({ size: '100% 100%', position: '0% 0%' })
  })
})
