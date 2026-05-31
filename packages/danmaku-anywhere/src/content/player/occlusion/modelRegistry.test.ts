import { describe, expect, test } from 'vitest'

import { getModel } from './modelRegistry'

/**
 * Verifies the occlusion model registry: each occlusionModel option maps to a
 * descriptor with the expected runtime, so the provider factory and the
 * segmenter iframe agree on how to run each model.
 */
describe('modelRegistry', () => {
  test('people maps to the mediapipe runtime', () => {
    expect(getModel('people').runtime).toBe('mediapipe')
  })

  test('anime maps to the ort runtime', () => {
    expect(getModel('anime').runtime).toBe('ort')
  })
})
