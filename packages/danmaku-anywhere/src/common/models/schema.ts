import { z } from 'zod'

/**
 * One declarative shape describes every segmentation model, bundled or hosted.
 * Adding or changing a hosted model is a manifest edit at the R2 level with no
 * extension code change. The optional `preprocessing` and `capture` defaults
 * reproduce today's bundled ISNet (anime) behavior exactly, so a new hosted ORT
 * model that matches that family runs with no new code.
 */

export const modelRuntimeSchema = z.enum(['mediapipe', 'ort'])
export type ModelRuntime = z.infer<typeof modelRuntimeSchema>

const preprocessingDefaults = {
  normalize: 'unit',
  layout: 'nchw',
  channelOrder: 'rgb',
  output: 'alpha',
} as const

const preprocessingSchema = z.object({
  // unit: /255 ([0,1]). signed: (/255 - 0.5) / 0.5 ([-1,1], e.g. MODNet).
  // imagenet: per-channel mean/std.
  normalize: z
    .enum(['unit', 'imagenet', 'signed'])
    .default(preprocessingDefaults.normalize),
  layout: z.enum(['nchw', 'nhwc']).default(preprocessingDefaults.layout),
  channelOrder: z
    .enum(['rgb', 'bgr'])
    .default(preprocessingDefaults.channelOrder),
  // [0,1] foreground alpha vs per-pixel class index.
  output: z.enum(['alpha', 'argmax']).default(preprocessingDefaults.output),
})
export type ModelPreprocessing = z.infer<typeof preprocessingSchema>

const captureSchema = z.object({
  size: z.number().int().positive(),
  preserveAspect: z.boolean(),
  minIntervalMs: z.number().int().nonnegative(),
})
export type ModelCapture = z.infer<typeof captureSchema>

export const modelEntrySchema = z
  .object({
    id: z.string().min(1),
    // Names live in data, not i18n keys, so a hosted manifest carries its own.
    label: z.object({ en: z.string(), zh: z.string() }),
    runtime: modelRuntimeSchema,
    delivery: z.enum(['bundled', 'hosted']),
    url: z.url().optional(),
    sha256: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/, 'sha256 must be 64 hex chars')
      .optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
    inputSize: z.number().int().positive(),
    preprocessing: preprocessingSchema.default(preprocessingDefaults),
    requiresWebGpu: z.boolean(),
    capture: captureSchema.optional(),
  })
  .refine(
    (entry) =>
      entry.delivery === 'bundled' ||
      (entry.url !== undefined && entry.sha256 !== undefined),
    {
      // A hosted model must carry a hash so its bytes are integrity-verified
      // before they reach the runtime; an entry without one is rejected and the
      // manifest falls back to the baseline.
      message: 'hosted models must have a url and sha256',
      path: ['sha256'],
    }
  )
export type ModelEntry = z.infer<typeof modelEntrySchema>

export const modelManifestSchema = z.object({
  version: z.number(),
  models: z.array(modelEntrySchema).min(1),
})
export type ModelManifest = z.infer<typeof modelManifestSchema>

/**
 * The download URL for a hosted model, cache-busted by content hash so a
 * re-uploaded model at the same path is never served stale from a CDN edge
 * cache (each version is a distinct URL). The iframe and the background worker
 * both fetch through this so they agree on the URL behind a shared OPFS entry.
 */
export function modelDownloadUrl(model: ModelEntry): string | undefined {
  if (!model.url) {
    return undefined
  }
  return model.sha256 ? `${model.url}?v=${model.sha256}` : model.url
}
