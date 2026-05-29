export type Size = { width: number; height: number }

export type Rect = { x: number; y: number; width: number; height: number }

export function computeContainRect(content: Size, box: Size): Rect {
  const contentAspect = content.width / content.height
  const boxAspect = box.width / box.height

  if (contentAspect > boxAspect) {
    const width = box.width
    const height = box.width / contentAspect
    return {
      x: 0,
      y: (box.height - height) / 2,
      width,
      height,
    }
  }

  const height = box.height
  const width = box.height * contentAspect
  return {
    x: (box.width - width) / 2,
    y: 0,
    width,
    height,
  }
}

export function buildAlphaMask(opts: {
  category: Uint8Array
  maskSize: Size
  box: Size
  isPerson: (v: number) => boolean
  outputScale?: number
  // The decoded frame's native size, used for object-fit:contain letterboxing.
  // Falls back to maskSize when the segmenter saw the full (un-letterboxed) frame.
  content?: Size
}): { data: Uint8ClampedArray; width: number; height: number } {
  const { category, maskSize, box, isPerson } = opts
  const outputScale = opts.outputScale ?? 1

  const width = Math.max(1, Math.round(box.width * outputScale))
  const height = Math.max(1, Math.round(box.height * outputScale))
  const data = new Uint8ClampedArray(width * height * 4)

  const contain = computeContainRect(opts.content ?? maskSize, box)

  for (let oy = 0; oy < height; oy++) {
    for (let ox = 0; ox < width; ox++) {
      const i = (oy * width + ox) * 4
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255

      const boxX = (ox + 0.5) / outputScale
      const boxY = (oy + 0.5) / outputScale

      const insideX = boxX >= contain.x && boxX < contain.x + contain.width
      const insideY = boxY >= contain.y && boxY < contain.y + contain.height
      if (!insideX || !insideY) {
        data[i + 3] = 255
        continue
      }

      const normX = (boxX - contain.x) / contain.width
      const normY = (boxY - contain.y) / contain.height

      let sx = Math.floor(normX * maskSize.width)
      let sy = Math.floor(normY * maskSize.height)
      if (sx >= maskSize.width) {
        sx = maskSize.width - 1
      }
      if (sy >= maskSize.height) {
        sy = maskSize.height - 1
      }

      const value = category[sy * maskSize.width + sx]
      data[i + 3] = isPerson(value) ? 0 : 255
    }
  }

  return { data, width, height }
}
