import { IS_DA_E2E } from '@/common/constants'
import { IframeMaskProvider, type SegmentEngine } from './IframeMaskProvider'
import { MockMaskProvider } from './MockMaskProvider'
import type { MaskProvider } from './types'

export type OcclusionModel = 'people' | 'anime'

const MODEL_ENGINE: Record<OcclusionModel, SegmentEngine> = {
  people: 'mediapipe',
  anime: 'anime',
}

export function createMaskProvider(
  model: OcclusionModel = 'people'
): MaskProvider {
  // e2e runs a deterministic mock so occlusion specs assert our pipeline
  // (capture, geometry, compositing) rather than the non-deterministic ML
  // model or a bundled person video.
  if (IS_DA_E2E) {
    return new MockMaskProvider()
  }
  return new IframeMaskProvider(MODEL_ENGINE[model])
}
