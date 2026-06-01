import type { ModelEntry } from '@/common/models/schema'
import { IframeMaskProvider } from './IframeMaskProvider'
import { MockMaskProvider } from './MockMaskProvider'
import type { MaskProvider } from './types'

export const MaskProviderFactory = Symbol.for('MaskProviderFactory')

export type IMaskProviderFactory = (descriptor: ModelEntry) => MaskProvider

export function maskProviderFactory(): IMaskProviderFactory {
  return (descriptor) => new IframeMaskProvider(descriptor)
}

/**
 * Deterministic stand-in bound in e2e (see uiIoc) so occlusion specs assert our
 * pipeline (capture, geometry, compositing) rather than the non-deterministic
 * model.
 */
export function mockMaskProviderFactory(): IMaskProviderFactory {
  return (descriptor) => new MockMaskProvider(descriptor)
}
