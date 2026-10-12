import { describe, expect, it } from 'vitest'
import { BASELINE_MANIFEST } from './baseline'
import { offeredModels, resolveOfferedModel } from './offeredModels'
import { modelEntrySchema } from './schema'

/**
 * Which segmentation models the extension offers and runs. Without the debug
 * option only bundled models are offered, and a saved id that is not offered,
 * such as a hosted model restored from a backup, resolves to the default People
 * model instead of being run.
 */

const people = modelEntrySchema.parse({
  id: 'people',
  label: { en: 'People', zh: '真人' },
  runtime: 'mediapipe',
  delivery: 'bundled',
  inputSize: 256,
  requiresWebGpu: false,
})

const anime = modelEntrySchema.parse({
  id: 'anime',
  label: { en: 'Anime', zh: '动画' },
  runtime: 'ort',
  delivery: 'hosted',
  url: 'https://example.test/anime.onnx',
  sha256: 'a'.repeat(64),
  inputSize: 320,
  requiresWebGpu: true,
})

describe('offeredModels', () => {
  it('offers only bundled models without the debug option', () => {
    expect(offeredModels([people, anime], false)).toEqual([people])
  })

  it('offers every model with the debug option', () => {
    expect(offeredModels([people, anime], true)).toEqual([people, anime])
  })
})

describe('resolveOfferedModel', () => {
  it('resolves an offered id to that model', () => {
    expect(resolveOfferedModel([people, anime], 'anime')).toBe(anime)
  })

  it('falls back to People for a hosted model that is not offered', () => {
    expect(
      resolveOfferedModel(offeredModels([people, anime], false), 'anime')
    ).toBe(people)
  })

  it('falls back to People for an unknown id', () => {
    expect(resolveOfferedModel([people, anime], 'does-not-exist')).toBe(people)
  })

  it('falls back to the baseline default when nothing is offered', () => {
    expect(resolveOfferedModel([], 'anime')).toBe(BASELINE_MANIFEST.models[0])
    expect(BASELINE_MANIFEST.models[0].id).toBe('people')
  })
})
