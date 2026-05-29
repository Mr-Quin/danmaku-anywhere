/**
 * Pure metadata + selection logic for the available segmentation models.
 *
 * This module is imported by both the content script (to choose a provider
 * given the user's saved option) and the segmenter iframe (to look up runtime
 * details such as the model URL and input size). It must stay free of heavy
 * runtime imports (no onnxruntime-web, no @mediapipe/tasks-vision) so it can be
 * loaded cheaply on either side.
 */

/**
 * Stable identifiers persisted in danmakuOptions.occlusionModel. Treat these as
 * a wire format: renaming an id requires a danmakuOptions migration.
 */
export type OcclusionModelId =
  | 'mediapipe-selfie'
  | 'mediapipe-deeplab'
  | 'anime-isnet'

export type ModelRuntime = 'mediapipe' | 'ort'

export type ModelDelivery = 'bundled' | 'hosted'

export type ModelAudience = 'people' | 'anime' | 'general'

export interface ModelDescriptor {
  readonly id: OcclusionModelId
  /** i18n key resolved by the settings UI, not a literal label. */
  readonly labelKey: string
  readonly runtime: ModelRuntime
  readonly delivery: ModelDelivery
  /**
   * Absolute fetch URL for hosted models, undefined for bundled ones. Hosted
   * models are downloaded as DATA at runtime inside the segmenter iframe and
   * cached in OPFS. ORT wasm always stays local regardless of this value.
   */
  readonly url?: string
  /** Lowercase hex sha256 of the hosted asset for integrity verification. */
  readonly sha256?: string
  /** Square inference resolution the runtime expects, in pixels. */
  readonly inputSize: number
  readonly recommendedFor: ModelAudience
  readonly requiresWebGpu: boolean
}

/**
 * Base URL for hosted model assets on Cloudflare R2, mirroring the ffmpeg wasm
 * precedent (assets.danmaku.weeblify.app). The exact path is a placeholder
 * until the quantized ISNet variant is uploaded.
 */
export const HOSTED_MODELS_BASE_URL =
  'https://assets.danmaku.weeblify.app/models'

export const ANIME_ISNET_URL = `${HOSTED_MODELS_BASE_URL}/anime-isnet.onnx`

export const DEFAULT_MODEL_ID: OcclusionModelId = 'mediapipe-selfie'

const MODEL_DESCRIPTORS: Readonly<Record<OcclusionModelId, ModelDescriptor>> = {
  'mediapipe-selfie': {
    id: 'mediapipe-selfie',
    labelKey: 'danmaku.occlusion.model.mediapipeSelfie',
    runtime: 'mediapipe',
    delivery: 'bundled',
    inputSize: 256,
    recommendedFor: 'people',
    requiresWebGpu: false,
  },
  'mediapipe-deeplab': {
    id: 'mediapipe-deeplab',
    labelKey: 'danmaku.occlusion.model.mediapipeDeeplab',
    runtime: 'mediapipe',
    delivery: 'bundled',
    inputSize: 257,
    recommendedFor: 'general',
    requiresWebGpu: false,
  },
  'anime-isnet': {
    id: 'anime-isnet',
    labelKey: 'danmaku.occlusion.model.animeIsnet',
    runtime: 'ort',
    delivery: 'hosted',
    url: ANIME_ISNET_URL,
    inputSize: 1024,
    recommendedFor: 'anime',
    requiresWebGpu: true,
  },
}

export const MODEL_IDS = Object.keys(
  MODEL_DESCRIPTORS
) as readonly OcclusionModelId[]

export const MODELS: readonly ModelDescriptor[] =
  Object.values(MODEL_DESCRIPTORS)

export function isOcclusionModelId(value: unknown): value is OcclusionModelId {
  return typeof value === 'string' && Object.hasOwn(MODEL_DESCRIPTORS, value)
}

/**
 * Look up a descriptor by id. Returns undefined for unknown ids so callers can
 * decide how to degrade. Use getModelOrDefault when a descriptor is required.
 */
export function getModel(id: OcclusionModelId): ModelDescriptor | undefined {
  return MODEL_DESCRIPTORS[id]
}

export function getModelOrDefault(id: unknown): ModelDescriptor {
  if (isOcclusionModelId(id)) {
    return MODEL_DESCRIPTORS[id]
  }
  return MODEL_DESCRIPTORS[DEFAULT_MODEL_ID]
}

export interface SelectModelCapabilities {
  /** Whether WebGPU is available in the segmenter iframe origin. */
  readonly webGpu: boolean
}

/**
 * Resolve the user's chosen model id to a usable descriptor given runtime
 * capabilities. Falls back to the default model when:
 *  - the chosen id is unknown (stale/corrupt option), or
 *  - the chosen model needs WebGPU but it is unavailable.
 *
 * The default model is assumed not to require WebGPU; this is asserted in the
 * tests so the fallback can never recurse into an unusable model.
 */
export function selectModel(
  chosen: unknown,
  capabilities: SelectModelCapabilities
): ModelDescriptor {
  const model = getModelOrDefault(chosen)
  if (model.requiresWebGpu && !capabilities.webGpu) {
    return MODEL_DESCRIPTORS[DEFAULT_MODEL_ID]
  }
  return model
}
