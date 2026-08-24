import type { ModelEntry } from '@/common/models/schema'

// Separate reasons because the user-facing remedy differs.
export type OcclusionStatusReason =
  | 'downloading'
  | 'init'
  | 'taint'
  | 'unreadable'
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
  // The anime model is distortion-sensitive; the people segmenter is not.
  capturePreserveAspect: boolean
  minIntervalMs: number
  outputMaxSide: number
  threshold: number
  edgeSoftness: number
  debug: boolean
  applyMask: (url?: string) => void
  onStatus?: (status: OcclusionStatus) => void
  onRunningChange?: (running: boolean) => void
  // Fires once the first mask is applied: "starting" versus "on".
  onActive?: () => void
}
