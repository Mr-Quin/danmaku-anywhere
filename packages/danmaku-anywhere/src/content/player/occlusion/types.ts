import type { Size } from './maskGeometry'

export type { Size }

export interface SegmentationResult {
  // Per-pixel mask in the segmenter's own grid (row-major): 0 = person (hidden),
  // non-zero = background (shown).
  category: Uint8Array
  maskSize: Size
}

export interface SegmentOptions {
  // Person-confidence cutoff [0,1] applied where confidence data is available.
  threshold?: number
}

/**
 * A source of per-frame segmentation masks. The implementation decides where
 * inference runs (a MediaPipe extension-iframe, or a deterministic mock).
 * `segment` takes ownership of the passed ImageBitmap (it may transfer or close
 * it), so callers must not use the bitmap afterwards.
 */
export interface MaskProvider {
  init(): Promise<void>
  segment(
    frame: ImageBitmap,
    options?: SegmentOptions
  ): Promise<SegmentationResult | null>
  dispose(): void
}
