import { type ModelManifest, modelManifestSchema } from './schema'

export const MANIFEST_URL =
  'https://assets.danmaku.weeblify.app/models/manifest.json'

// The only origin hosted models may be fetched from in PR1. The segmenter iframe
// receives its descriptor over postMessage (whose source the iframe cannot
// distinguish from a malicious host-page script), so it validates the download
// origin against this before fetching. Arbitrary-origin model fetch is a later
// phase with its own connect-src trust handling.
export const TRUSTED_MODEL_ORIGIN = new URL(MANIFEST_URL).origin

// Zero-friction default: bundled MediaPipe, no download, no WebGPU.
export const DEFAULT_MODEL_ID = 'people'

/**
 * Shipped fallback manifest, used on first run and whenever the hosted manifest
 * is unreachable or invalid. Defines the two models the extension has always
 * had so occlusion keeps working offline and before the R2 manifest exists.
 * Parsed through the schema so its defaults match a hosted entry's exactly.
 */
export const BASELINE_MANIFEST: ModelManifest = modelManifestSchema.parse({
  version: 1,
  models: [
    {
      id: 'people',
      label: { en: 'People', zh: '真人' },
      runtime: 'mediapipe',
      delivery: 'bundled',
      inputSize: 256,
      requiresWebGpu: false,
    },
    {
      id: 'anime',
      label: { en: 'Anime', zh: '动画' },
      runtime: 'ort',
      delivery: 'hosted',
      url: 'https://assets.danmaku.weeblify.app/models/anime-isnet.onnx',
      sha256:
        'bed52e3bc068689c1b37f73871e184ae65e183cb6232097bb7fb72a72372f60e',
      inputSize: 320,
      requiresWebGpu: true,
      capture: { size: 512, preserveAspect: true, minIntervalMs: 500 },
    },
  ],
})
