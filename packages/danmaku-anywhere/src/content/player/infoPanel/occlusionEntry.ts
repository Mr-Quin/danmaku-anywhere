import type {
  OcclusionStatus,
  OcclusionStatusReason,
} from '@/content/player/occlusion/Occlusion.types'
import type { OcclusionEntry } from './panelEntry'

// `downloading` is the only progress reason; init/webgpu/taint/unavailable/
// segment are all failures the service emits via status().
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
  private error?: string
  private loadingMessage?: string

  setRunning(running: boolean): void {
    this.running = running
    if (running) {
      this.error = undefined
      this.loadingMessage = undefined
    } else {
      this.active = false
    }
  }

  setActive(): void {
    this.active = true
    this.error = undefined
    this.loadingMessage = undefined
  }

  setStatus(status: OcclusionStatus): void {
    if (LOADING_REASONS.has(status.reason)) {
      this.loadingMessage = status.message
    } else {
      this.error = status.message
    }
  }

  // The feature was turned off (or unmounted): drop everything so no occlusion
  // row lingers while occlusion is not engaged.
  reset(): void {
    this.running = false
    this.active = false
    this.error = undefined
    this.loadingMessage = undefined
  }

  current(): OcclusionEntry | undefined {
    if (this.active) {
      return { source: 'occlusion', state: 'on' }
    }
    if (this.error !== undefined) {
      return { source: 'occlusion', state: 'error', message: this.error }
    }
    if (this.running) {
      return this.loadingMessage !== undefined
        ? {
            source: 'occlusion',
            state: 'loading',
            message: this.loadingMessage,
          }
        : { source: 'occlusion', state: 'loading' }
    }
    return undefined
  }
}
