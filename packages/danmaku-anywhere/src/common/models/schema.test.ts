import { describe, expect, it } from 'vitest'
import { modelEntrySchema, modelManifestSchema } from './schema'

/**
 * Validates the model manifest schema: that omitting `preprocessing` fills in
 * the ISNet-equivalent defaults (unit/nchw/rgb/alpha), that a hosted entry
 * without a url is rejected while a bundled one is accepted, and that a
 * well-formed manifest round-trips. These defaults are load-bearing because the
 * segmenter relies on them to reproduce today's anime behavior exactly.
 */

const bundled = {
  id: 'people',
  label: { en: 'People', zh: '真人' },
  runtime: 'mediapipe',
  delivery: 'bundled',
  inputSize: 256,
  requiresWebGpu: false,
}

const hosted = {
  id: 'anime',
  label: { en: 'Anime', zh: '动画' },
  runtime: 'ort',
  delivery: 'hosted',
  url: 'https://example.test/anime.onnx',
  inputSize: 320,
  requiresWebGpu: true,
}

describe('modelEntrySchema', () => {
  it('fills preprocessing with ISNet-equivalent defaults when omitted', () => {
    const entry = modelEntrySchema.parse(hosted)
    expect(entry.preprocessing).toEqual({
      normalize: 'unit',
      layout: 'nchw',
      channelOrder: 'rgb',
      output: 'alpha',
    })
  })

  it('defaults only the missing preprocessing fields', () => {
    const entry = modelEntrySchema.parse({
      ...hosted,
      preprocessing: { normalize: 'imagenet', channelOrder: 'bgr' },
    })
    expect(entry.preprocessing).toEqual({
      normalize: 'imagenet',
      layout: 'nchw',
      channelOrder: 'bgr',
      output: 'alpha',
    })
  })

  it('rejects a hosted entry without a url', () => {
    expect(() =>
      modelEntrySchema.parse({ ...hosted, url: undefined })
    ).toThrow()
  })

  it('accepts a bundled entry without a url', () => {
    expect(() => modelEntrySchema.parse(bundled)).not.toThrow()
  })
})

describe('modelManifestSchema', () => {
  it('parses a well-formed manifest', () => {
    const manifest = modelManifestSchema.parse({
      version: 1,
      models: [bundled, hosted],
    })
    expect(manifest.models).toHaveLength(2)
  })

  it('rejects a manifest with no models', () => {
    expect(() =>
      modelManifestSchema.parse({ version: 1, models: [] })
    ).toThrow()
  })
})
