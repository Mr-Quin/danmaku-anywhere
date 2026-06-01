import { describe, expect, test } from 'vitest'
import { getModel } from './modelRegistry'

/**
 * Verifies the occlusion model descriptors the rest of the system depends on:
 * the people model is bundled (mediapipe, no hosted url), the anime model is
 * hosted ort with the input size segmenterFrame feeds the tensor and an sha256
 * the OPFS cache verifies. A wrong runtime, inputSize, or hosting flag is a real
 * shippable bug a runtime-string check alone would miss.
 */
describe('modelRegistry', () => {
  test('people is a bundled mediapipe model', () => {
    const people = getModel('people')
    expect(people.runtime).toBe('mediapipe')
    expect(people.inputSize).toBe(256)
    expect(people.url).toBeUndefined()
    expect(people.sha256).toBeUndefined()
  })

  test('anime is a hosted ort model with an integrity hash', () => {
    const anime = getModel('anime')
    expect(anime.runtime).toBe('ort')
    expect(anime.inputSize).toBe(320)
    expect(anime.url).toMatch(/^https:\/\/\S+\.onnx$/)
    expect(anime.sha256).toMatch(/^[0-9a-f]{64}$/)
  })
})
