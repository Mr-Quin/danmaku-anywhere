import type { ModelEntry } from '@/common/models/schema'

// Distinct reasons because the user-facing remedy differs (taint vs webgpu vs
// init); the rest are surfaced the same way.
export type OcclusionStatusReason =
  | 'downloading'
  | 'init'
  | 'taint'
  | 'webgpu'
  | 'segment'
  | 'unavailable'

export interface OcclusionStatus {
  reason: OcclusionStatusReason
  message: string
}

export interface OcclusionStats {
  running: boolean
  fps: number | null
  lastError: string | null
  debugOverlay: boolean
}

export interface OcclusionConfig {
  descriptor: ModelEntry
  captureSize: number
  // Capture at the video's aspect ratio (long side = captureSize) instead of a
  // square. The anime model is distortion-sensitive; the people segmenter is
  // robust and uses the cheaper square capture.
  capturePreserveAspect: boolean
  minIntervalMs: number
  outputMaxSide: number
  threshold: number
  edgeSoftness: number
  debug: boolean
  applyMask: (url?: string) => void
  // Classified failure gates a higher layer (settings/toast) surfaces; also
  // tracked as lastError in stats.
  onStatus?: (status: OcclusionStatus) => void
  // Fires when the segmentation loop starts or stops running, so a status
  // surface can show the steady on/off state, which has no status reason.
  onRunningChange?: (running: boolean) => void
}
