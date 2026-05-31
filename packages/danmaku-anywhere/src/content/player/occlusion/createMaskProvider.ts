import { IS_DA_E2E } from '@/common/constants'
import type { OcclusionModel } from '@/common/options/danmakuOptions/constant'
import { IframeMaskProvider } from './IframeMaskProvider'
import { MockMaskProvider } from './MockMaskProvider'
import { getModel } from './modelRegistry'
import type { MaskProvider } from './types'

export function createMaskProvider(model: OcclusionModel): MaskProvider {
  // e2e runs a deterministic mock so occlusion specs assert our pipeline
  // (capture, geometry, compositing) rather than the non-deterministic ML
  // model or a bundled person video.
  if (IS_DA_E2E) {
    return new MockMaskProvider(model)
  }
  return new IframeMaskProvider(getModel(model).runtime)
}
