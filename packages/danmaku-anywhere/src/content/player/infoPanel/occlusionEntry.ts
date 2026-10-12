import type {
  OcclusionStatus,
  OcclusionStatusReason,
} from '@/content/player/occlusion/Occlusion.types'
import type { OcclusionEntry } from './panelEntry'

// `downloading` is the only progress reason; init/webgpu/taint/unreadable/
// unavailable/segment are all failures the service emits via status().
const LOADING_REASONS: ReadonlySet<OcclusionStatusReason> = new Set([
  'downloading',
])

/**
 * Occlusion as a small state machine. The loop reports "running" before it
 * produces anything (model load, warm-up), so running-but-not-yet-active is
 * loading; on begins the moment the first mask is applied.
 */
export class OcclusionEntryDeriver {
  private running = false
  private active = false
  private errorReason?: OcclusionStatusReason
  private loadingReason?: OcclusionStatusReason

  setRunning(running: boolean): void {
    this.running = running
    if (running) {
      this.errorReason = undefined
      this.loadingReason = undefined
    } else {
      this.active = false
    }
  }

  setActive(): void {
    this.active = true
    this.errorReason = undefined
    this.loadingReason = undefined
  }

  setStatus(status: OcclusionStatus): void {
    if (LOADING_REASONS.has(status.reason)) {
      this.loadingReason = status.reason
    } else {
      this.errorReason = status.reason
    }
  }

  // The feature was turned off (or unmounted): drop everything so no occlusion
  // row lingers while occlusion is not engaged.
  reset(): void {
    this.running = false
    this.active = false
    this.errorReason = undefined
    this.loadingReason = undefined
  }

  current(): OcclusionEntry | undefined {
    if (this.active) {
      return { source: 'occlusion', state: 'on' }
    }
    if (this.errorReason !== undefined) {
      return { source: 'occlusion', state: 'error', reason: this.errorReason }
    }
    if (this.running) {
      return this.loadingReason !== undefined
        ? {
            source: 'occlusion',
            state: 'loading',
            reason: this.loadingReason,
          }
        : { source: 'occlusion', state: 'loading' }
    }
    return undefined
  }
}
