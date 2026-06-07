import { buildAlphaMask, type Mask } from './maskGeometry'
import type { SegmentationResult } from './types'

// The bundled selfie_segmenter's category mask marks the PERSON as category 0
// and the background as non-zero (verified empirically against the shipped
// model; inverted from some MediaPipe docs). Danmaku hide where the person is,
// so person pixels become transparent (alpha 0) in the mask.
function isPerson(value: number): boolean {
  return value === 0
}

export interface CompositeOptions {
  outputMaxSide: number
  edgeSoftness: number
}

export interface CompositeResult {
  url: string
  mask: Mask
}

/**
 * Turns a segmentation result into an alpha-mask PNG data URL sized to the
 * video's on-screen box: builds the mask (letterboxed via maskGeometry), softens
 * its edges with a blur pass, and serializes it. Owns the reused canvases so the
 * per-frame loop allocates nothing steady-state.
 */
export class MaskCompositor {
  private readonly maskCanvas = document.createElement('canvas')
  private readonly rawMaskCanvas = document.createElement('canvas')
  private readonly maskCtx = this.maskCanvas.getContext('2d')
  private readonly rawMaskCtx = this.rawMaskCanvas.getContext('2d')
  private imageData?: ImageData

  constructor(private readonly log: (message: string) => void) {}

  compose(
    result: SegmentationResult,
    video: HTMLVideoElement,
    options: CompositeOptions
  ): CompositeResult | null {
    const maskCtx = this.maskCtx
    const rawMaskCtx = this.rawMaskCtx
    if (!maskCtx || !rawMaskCtx) {
      return null
    }

    const box = { width: video.clientWidth, height: video.clientHeight }
    if (box.width === 0 || box.height === 0) {
      this.log('video box has zero size; skipping')
      return null
    }
    const content = {
      width: video.videoWidth || box.width,
      height: video.videoHeight || box.height,
    }
    const outputScale = Math.min(
      1,
      options.outputMaxSide / Math.max(box.width, box.height)
    )

    const mask = buildAlphaMask({
      category: result.category,
      maskSize: result.maskSize,
      content,
      box,
      outputScale,
      isPerson,
    })

    if (
      this.maskCanvas.width !== mask.width ||
      this.maskCanvas.height !== mask.height ||
      !this.imageData
    ) {
      this.maskCanvas.width = mask.width
      this.maskCanvas.height = mask.height
      this.rawMaskCanvas.width = mask.width
      this.rawMaskCanvas.height = mask.height
      this.imageData = rawMaskCtx.createImageData(mask.width, mask.height)
    }
    this.imageData.data.set(mask.data)
    rawMaskCtx.putImageData(this.imageData, 0, 0)

    maskCtx.clearRect(0, 0, mask.width, mask.height)
    maskCtx.filter =
      options.edgeSoftness > 0 ? `blur(${options.edgeSoftness}px)` : 'none'
    maskCtx.drawImage(this.rawMaskCanvas, 0, 0)
    maskCtx.filter = 'none'

    return { url: this.maskCanvas.toDataURL('image/png'), mask }
  }
}
