import { IS_DA_E2E } from '@/common/constants'
import { IframeMaskProvider } from './IframeMaskProvider'
import { MockMaskProvider } from './MockMaskProvider'
import type { MaskProvider } from './types'

export function createMaskProvider(): MaskProvider {
  // e2e runs a deterministic mock so occlusion specs assert our pipeline
  // (capture, geometry, compositing) rather than the non-deterministic ML
  // model or a bundled person video.
  if (IS_DA_E2E) {
    return new MockMaskProvider()
  }
  return new IframeMaskProvider()
}
