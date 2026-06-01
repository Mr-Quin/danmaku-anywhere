import type { ModelEntry } from '@/common/models/schema'
import type { MaskProvider, SegmentationResult, Size } from './types'

/**
 * Deterministic stand-in for the real segmenter, used by e2e and dev. For a
 * model that does not need WebGPU it marks a centered ellipse as "person" so the
 * full mask pipeline runs without a real runtime or person video (person =
 * category 0, background = non-zero, matching the selfie segmenter). For a
 * WebGPU-requiring model it rejects init with a WebGPU error: e2e/CI browsers
 * have no WebGPU, so this is the faithful stand-in for what the real ORT runtime
 * does there, and it lets the error-visibility path be asserted deterministically.
 */
export class MockMaskProvider implements MaskProvider {
  private readonly category: Uint8Array
  private readonly maskSize: Size

  constructor(
    private readonly descriptor: ModelEntry,
    maskSize: Size = { width: 256, height: 256 }
  ) {
    this.maskSize = maskSize
    this.category = buildCenteredEllipse(maskSize)
  }

  init(): Promise<void> {
    if (this.descriptor.requiresWebGpu) {
      return Promise.reject(
        new Error('WebGPU is unavailable; this model requires WebGPU')
      )
    }
    return Promise.resolve()
  }

  segment(frame: ImageBitmap): Promise<SegmentationResult | null> {
    frame.close()
    return Promise.resolve({ category: this.category, maskSize: this.maskSize })
  }
}

function buildCenteredEllipse(size: Size): Uint8Array {
  const out = new Uint8Array(size.width * size.height).fill(1)
  const cx = size.width / 2
  const cy = size.height / 2
  const rx = size.width * 0.22
  const ry = size.height * 0.38
  for (let y = 0; y < size.height; y++) {
    for (let x = 0; x < size.width; x++) {
      const nx = (x - cx) / rx
      const ny = (y - cy) / ry
      if (nx * nx + ny * ny <= 1) {
        out[y * size.width + x] = 0
      }
    }
  }
  return out
}
