import type { Size } from './maskGeometry'

export type { Size }

export interface SegmentationResult {
  // Per-pixel category values in the segmenter's own grid (row-major).
  category: Uint8Array
  maskSize: Size
}

/**
 * A source of per-frame segmentation masks. The implementation decides where
 * inference runs (a MediaPipe extension-iframe, or a deterministic mock).
 * `segment` takes ownership of the passed ImageBitmap (it may transfer or close
 * it), so callers must not use the bitmap afterwards.
 */
export interface MaskProvider {
  init(): Promise<void>
  segment(frame: ImageBitmap): Promise<SegmentationResult | null>
  dispose(): void
}
