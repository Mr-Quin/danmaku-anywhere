import type { OcclusionModel } from '@/common/options/danmakuOptions/constant'

/**
 * Pure metadata for the segmentation model behind each occlusionModel choice.
 * Imported by both the content script (to pick a provider runtime from the
 * saved option) and the segmenter iframe (to look up the inference size), so it
 * must stay free of heavy runtime imports (no onnxruntime-web, no
 * @mediapipe/tasks-vision) to load cheaply on either side.
 */

export type ModelRuntime = 'mediapipe' | 'ort'

export interface ModelDescriptor {
  readonly runtime: ModelRuntime
  /** Square inference resolution the runtime expects, in pixels. */
  readonly inputSize: number
  /**
   * Hosted model fetched at runtime and cached in OPFS (downloaded once, one
   * disk copy). Undefined for runtimes whose model ships locally (mediapipe).
   */
  readonly url?: string
  /** Lowercase hex sha256 of the hosted asset, verified after download. */
  readonly sha256?: string
}

const HOSTED_MODELS_BASE_URL = 'https://assets.danmaku.weeblify.app/models'

const MODEL_DESCRIPTORS: Readonly<Record<OcclusionModel, ModelDescriptor>> = {
  people: {
    runtime: 'mediapipe',
    inputSize: 256,
  },
  anime: {
    runtime: 'ort',
    inputSize: 1024,
    url: `${HOSTED_MODELS_BASE_URL}/anime-isnet.onnx`,
    sha256: 'f15622d853e8260172812b657053460e20806f04b9e05147d49af7bed31a6e99',
  },
}

export function getModel(model: OcclusionModel): ModelDescriptor {
  return MODEL_DESCRIPTORS[model]
}
