import type { DanmakuOptions } from './options'

export interface MaskPlacement {
  size: string
  position: string
}

/**
 * The occlusion mask is drawn for the whole video, but it is applied to the
 * danmaku container, which only spans the configured area. Scaling the mask by
 * the inverse of the area and shifting it by the area's start keeps each mask
 * pixel over the same video pixel.
 */
export function occlusionMaskPlacement(
  area: DanmakuOptions['area']
): MaskPlacement {
  const x = axisPlacement(area.xStart, area.xEnd)
  const y = axisPlacement(area.yStart, area.yEnd)
  return {
    size: `${x.size}% ${y.size}%`,
    position: `${x.position}% ${y.position}%`,
  }
}

function axisPlacement(
  startPercent: number,
  endPercent: number
): { size: number; position: number } {
  const span = (endPercent - startPercent) / 100
  if (span <= 0 || span >= 1) {
    return { size: 100, position: 0 }
  }
  const start = startPercent / 100
  // A mask-position percentage p places the image at (box - image) * p, so an
  // offset of -start video widths needs p = start / (1 - span).
  return {
    size: round(100 / span),
    position: round((start / (1 - span)) * 100),
  }
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000
}
