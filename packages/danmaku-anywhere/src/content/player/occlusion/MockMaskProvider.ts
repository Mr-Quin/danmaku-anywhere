import type { MaskProvider, SegmentationResult, Size } from './types'

/**
 * Deterministic stand-in for the real segmenter: marks a centered ellipse as
 * "person" so the full mask pipeline can be exercised without MediaPipe or a
 * real-person video. Matches the bundled selfie_segmenter convention (person =
 * category 0, background = non-zero). Used by e2e and dev verification.
 */
export class MockMaskProvider implements MaskProvider {
  private readonly category: Uint8Array
  private readonly maskSize: Size

  constructor(maskSize: Size = { width: 256, height: 256 }) {
    this.maskSize = maskSize
    this.category = buildCenteredEllipse(maskSize)
  }

  init(): Promise<void> {
    return Promise.resolve()
  }

  segment(frame: ImageBitmap): Promise<SegmentationResult | null> {
    frame.close()
    return Promise.resolve({ category: this.category, maskSize: this.maskSize })
  }

  dispose(): void {
    // nothing to release
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
