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
  // Opaque white everywhere except person pixels, which become transparent. Pre-
  // fill so the per-frame hot loop only writes the alpha it needs to clear.
  data.fill(255)

  const contain = computeContainRect(opts.content ?? maskSize, box)

  // This runs every frame on the main thread. Precompute the exact output rows
  // and columns that land inside the contain rect, so letterbox/pillarbox pixels
  // are skipped by the loop bounds instead of a per-pixel branch, and reduce the
  // box->mask sample mapping to one multiply-add per axis (sample = floor(o *
  // step + base), the same value the per-pixel form computed).
  const invScale = 1 / outputScale
  const oyStart = Math.max(0, Math.ceil(contain.y * outputScale - 0.5))
  const oyEnd = Math.min(
    height,
    Math.ceil((contain.y + contain.height) * outputScale - 0.5)
  )
  const oxStart = Math.max(0, Math.ceil(contain.x * outputScale - 0.5))
  const oxEnd = Math.min(
    width,
    Math.ceil((contain.x + contain.width) * outputScale - 0.5)
  )

  const sxStep = maskSize.width / (outputScale * contain.width)
  const sxBase = (0.5 * invScale - contain.x) * (maskSize.width / contain.width)
  const syStep = maskSize.height / (outputScale * contain.height)
  const syBase =
    (0.5 * invScale - contain.y) * (maskSize.height / contain.height)

  for (let oy = oyStart; oy < oyEnd; oy++) {
    let sy = Math.floor(oy * syStep + syBase)
    if (sy < 0) {
      sy = 0
    } else if (sy >= maskSize.height) {
      sy = maskSize.height - 1
    }
    const rowOffset = sy * maskSize.width
    const rowStart = oy * width * 4

    for (let ox = oxStart; ox < oxEnd; ox++) {
      let sx = Math.floor(ox * sxStep + sxBase)
      if (sx < 0) {
        sx = 0
      } else if (sx >= maskSize.width) {
        sx = maskSize.width - 1
      }

      if (isPerson(category[rowOffset + sx])) {
        data[rowStart + ox * 4 + 3] = 0
      }
    }
  }

  return { data, width, height }
}
