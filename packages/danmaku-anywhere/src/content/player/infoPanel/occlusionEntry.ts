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
 * Folds the occlusion service's two signal streams (status reasons and the
 * running flag) into the current occlusion panel entry, or undefined when the
 * feature is not engaged so the row is absent. Running wins: an error only
 * surfaces once the loop has actually stopped.
 */
export class OcclusionEntryDeriver {
  private running = false
  private error?: string
  private loading?: string

  setRunning(running: boolean): void {
    this.running = running
    if (running) {
      this.error = undefined
      this.loading = undefined
    }
  }

  setStatus(status: OcclusionStatus): void {
    if (LOADING_REASONS.has(status.reason)) {
      this.loading = status.message
      this.error = undefined
    } else {
      this.error = status.message
      this.loading = undefined
    }
  }

  current(): OcclusionEntry | undefined {
    if (this.running) {
      return { source: 'occlusion', state: 'on' }
    }
    if (this.error !== undefined) {
      return { source: 'occlusion', state: 'error', message: this.error }
    }
    if (this.loading !== undefined) {
      return { source: 'occlusion', state: 'loading', message: this.loading }
    }
    return undefined
  }
}
