import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MaskCompositor } from './MaskCompositor'
import type { SegmentationResult } from './types'

class FakeCtx {
  filter = 'none'
  filterAtDraw: string | null = null
  clearRect = vi.fn()
  drawImage = vi.fn(() => {
    this.filterAtDraw = this.filter
  })
  putImageData = vi.fn()
  createImageData = (w: number, h: number) => ({
    data: new Uint8ClampedArray(w * h * 4),
  })
}

class FakeCanvas {
  width = 0
  height = 0
  readonly ctx = new FakeCtx()
  getContext = () => this.ctx
  toDataURL = vi.fn(() => 'data:image/png;base64,AAAA')
}

let canvases: FakeCanvas[]

beforeEach(() => {
  canvases = []
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'canvas') {
      const canvas = new FakeCanvas()
      canvases.push(canvas)
      return canvas as unknown as HTMLCanvasElement
    }
    throw new Error(`unexpected createElement(${tag})`)
  }) as typeof document.createElement)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function makeResult(): SegmentationResult {
  return {
    category: new Uint8Array([0, 1, 1, 0]),
    maskSize: { width: 2, height: 2 },
  }
}

function makeVideo(
  overrides: Partial<HTMLVideoElement> = {}
): HTMLVideoElement {
  return {
    clientWidth: 100,
    clientHeight: 100,
    videoWidth: 100,
    videoHeight: 100,
    ...overrides,
  } as HTMLVideoElement
}

describe('MaskCompositor', () => {
  it('composes a mask into a PNG data URL', () => {
    const compositor = new MaskCompositor(() => undefined)

    const result = compositor.compose(makeResult(), makeVideo(), {
      outputMaxSide: 64,
      edgeSoftness: 0,
    })

    expect(result?.url).toBe('data:image/png;base64,AAAA')
    // box 100x100 capped at outputMaxSide 64 => outputScale 0.64 => 64x64.
    expect(result?.mask.width).toBe(64)
    expect(result?.mask.height).toBe(64)
    const [maskCanvas, rawMaskCanvas] = canvases
    expect(rawMaskCanvas.ctx.putImageData).toHaveBeenCalled()
    expect(maskCanvas.ctx.drawImage).toHaveBeenCalled()
  })

  it('skips and logs when the video box has zero size', () => {
    const log = vi.fn()
    const compositor = new MaskCompositor(log)

    const result = compositor.compose(
      makeResult(),
      makeVideo({ clientWidth: 0, clientHeight: 0 }),
      { outputMaxSide: 64, edgeSoftness: 0 }
    )

    expect(result).toBeNull()
    expect(log).toHaveBeenCalledWith('video box has zero size; skipping')
  })

  it('applies a blur filter when edge softness is set', () => {
    const compositor = new MaskCompositor(() => undefined)

    compositor.compose(makeResult(), makeVideo(), {
      outputMaxSide: 64,
      edgeSoftness: 4,
    })

    const maskCanvas = canvases[0]
    expect(maskCanvas.ctx.filterAtDraw).toBe('blur(4px)')
    // filter is reset to 'none' after the blurred draw.
    expect(maskCanvas.ctx.filter).toBe('none')
  })
})
