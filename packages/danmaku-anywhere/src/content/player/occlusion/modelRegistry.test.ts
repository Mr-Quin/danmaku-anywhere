import { describe, expect, test } from 'vitest'

/**
 * Exercises the segmentation model registry's selection logic:
 *  - default selection resolves to a non-WebGPU bundled model
 *  - the anime model downgrades to the default when WebGPU is absent
 *  - an unknown / stale option id falls back to the default model
 *  - hosted descriptors carry a url, bundled ones do not
 * Pure metadata module; no runtime (ORT / MediaPipe) imports are involved.
 */

import {
  DEFAULT_MODEL_ID,
  getModel,
  getModelOrDefault,
  isOcclusionModelId,
  MODEL_IDS,
  MODELS,
  selectModel,
} from './modelRegistry'

describe('modelRegistry metadata', () => {
  test('default model exists and does not require WebGPU', () => {
    const def = getModel(DEFAULT_MODEL_ID)
    expect(def).toBeDefined()
    expect(def?.requiresWebGpu).toBe(false)
    expect(def?.delivery).toBe('bundled')
  })

  test('every descriptor id matches its registry key', () => {
    for (const id of MODEL_IDS) {
      expect(getModel(id)?.id).toBe(id)
    }
  })

  test('hosted models carry a url, bundled models do not', () => {
    for (const model of MODELS) {
      if (model.delivery === 'hosted') {
        expect(model.url).toBeTruthy()
      } else {
        expect(model.url).toBeUndefined()
      }
    }
  })

  test('isOcclusionModelId narrows known ids and rejects junk', () => {
    expect(isOcclusionModelId('anime-isnet')).toBe(true)
    expect(isOcclusionModelId('nope')).toBe(false)
    expect(isOcclusionModelId(undefined)).toBe(false)
    expect(isOcclusionModelId(42)).toBe(false)
  })
})

describe('getModelOrDefault', () => {
  test('returns the requested model when known', () => {
    expect(getModelOrDefault('anime-isnet').id).toBe('anime-isnet')
  })

  test('returns the default for unknown ids', () => {
    expect(getModelOrDefault('does-not-exist').id).toBe(DEFAULT_MODEL_ID)
    expect(getModelOrDefault(null).id).toBe(DEFAULT_MODEL_ID)
  })
})

describe('selectModel', () => {
  test('default selection picks the default model', () => {
    const selected = selectModel(DEFAULT_MODEL_ID, { webGpu: true })
    expect(selected.id).toBe(DEFAULT_MODEL_ID)
  })

  test('anime model is kept when WebGPU is available', () => {
    const selected = selectModel('anime-isnet', { webGpu: true })
    expect(selected.id).toBe('anime-isnet')
  })

  test('anime model downgrades to default when WebGPU is absent', () => {
    const selected = selectModel('anime-isnet', { webGpu: false })
    expect(selected.id).toBe(DEFAULT_MODEL_ID)
    expect(selected.requiresWebGpu).toBe(false)
  })

  test('unknown id downgrades to default regardless of capability', () => {
    expect(selectModel('garbage', { webGpu: true }).id).toBe(DEFAULT_MODEL_ID)
    expect(selectModel('garbage', { webGpu: false }).id).toBe(DEFAULT_MODEL_ID)
  })

  test('the default model never requires WebGPU so fallback is always usable', () => {
    const fallback = selectModel('anime-isnet', { webGpu: false })
    expect(fallback.requiresWebGpu).toBe(false)
  })
})
