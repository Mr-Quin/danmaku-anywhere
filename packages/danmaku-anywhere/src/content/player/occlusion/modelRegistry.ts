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
}

const MODEL_DESCRIPTORS: Readonly<Record<OcclusionModel, ModelDescriptor>> = {
  people: {
    runtime: 'mediapipe',
    inputSize: 256,
  },
  anime: {
    runtime: 'ort',
    inputSize: 1024,
  },
}

export function getModel(model: OcclusionModel): ModelDescriptor {
  return MODEL_DESCRIPTORS[model]
}
