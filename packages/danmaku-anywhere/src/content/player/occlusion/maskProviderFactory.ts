import type { OcclusionModel } from '@/common/options/danmakuOptions/constant'
import { IframeMaskProvider } from './IframeMaskProvider'
import { MockMaskProvider } from './MockMaskProvider'
import { getModel } from './modelRegistry'
import type { MaskProvider } from './types'

export const MaskProviderFactory = Symbol.for('MaskProviderFactory')

export type IMaskProviderFactory = (model: OcclusionModel) => MaskProvider

export function maskProviderFactory(): IMaskProviderFactory {
  return (model) => new IframeMaskProvider(getModel(model).runtime)
}

/**
 * Deterministic stand-in bound in e2e (see uiIoc) so occlusion specs assert our
 * pipeline (capture, geometry, compositing) rather than the non-deterministic
 * model.
 */
export function mockMaskProviderFactory(): IMaskProviderFactory {
  return (model) => new MockMaskProvider(model)
}
