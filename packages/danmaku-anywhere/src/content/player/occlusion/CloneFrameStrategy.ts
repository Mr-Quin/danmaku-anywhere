import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { probeReadability } from './frameProbe'
import type {
  AcquireResult,
  FrameFailure,
  FrameStrategy,
} from './frameStrategy'

const DRIFT_TOLERANCE_SECONDS = 0.2
const CLONE_READY_TIMEOUT_MS = 20_000

/**
 * Reads a tainted cross-origin video via a hidden crossorigin clone (a
 * background DNR rule supplies ACAO) instead of the live element, leaving
 * playback untouched. Built only for an http(s) source.
 */
export class CrossOriginCapture {
  private clone: HTMLVideoElement | null = null
  private ruleId: number | null = null
  private disposed = false

  constructor(private readonly original: HTMLVideoElement) {}

  async setup(): Promise<HTMLVideoElement | null> {
    const src = this.original.currentSrc

    try {
      this.ruleId = (
        await chromeRpcClient.occlusionAddCorsRule({ url: src })
      ).data
      if (this.disposed) {
        this.dispose()
        return null
      }

      const clone = document.createElement('video')
      clone.crossOrigin = 'anonymous'
      clone.muted = true
      clone.playsInline = true
      clone.preload = 'auto'
      clone.style.cssText =
        'position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;opacity:0;pointer-events:none;'
      clone.src = src
      document.body.appendChild(clone)
      this.clone = clone

      const ready = await this.waitReady(clone)
      if (!ready || this.disposed) {
        this.dispose()
        return null
      }
      // Not synced here: the caller has to probe a frame a seek would drop.
      return clone
    } catch {
      // Any failure: give up cleanly so the caller falls back to the taint
      // status rather than capturing the unrecovered original.
      this.dispose()
      return null
    }
  }

  // Align the clone to the live element; called once per capture cycle.
  sync(): void {
    const clone = this.clone
    if (!clone) {
      return
    }
    const target = this.original.currentTime
    // Match rate, else a non-1x original drifts and seeks every cycle.
    if (clone.playbackRate !== this.original.playbackRate) {
      clone.playbackRate = this.original.playbackRate
    }
    if (Math.abs(clone.currentTime - target) > DRIFT_TOLERANCE_SECONDS) {
      clone.currentTime = target
    }
    if (this.original.paused) {
      if (!clone.paused) {
        clone.pause()
      }
    } else if (clone.paused) {
      void clone.play().catch(() => undefined)
    }
  }

  dispose(): void {
    this.disposed = true
    const clone = this.clone
    if (clone) {
      clone.pause()
      clone.removeAttribute('src')
      clone.load()
      clone.remove()
      this.clone = null
    }
    void this.removeRule()
  }

  private waitReady(clone: HTMLVideoElement): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false
      const finish = (value: boolean) => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        clone.removeEventListener('loadedmetadata', onMeta)
        clone.removeEventListener('loadeddata', onReady)
        clone.removeEventListener('seeked', onReady)
        clone.removeEventListener('error', onError)
        resolve(value)
      }
      const seekToLive = () => {
        if (clone.currentTime !== this.original.currentTime) {
          clone.currentTime = this.original.currentTime
        }
        void clone.play().catch(() => undefined)
      }
      const onMeta = () => seekToLive()
      // readyState dips during a seek; gate on the decoded frame, not the event.
      const onReady = () => {
        if (clone.readyState >= 2) {
          finish(true)
        }
      }
      const onError = () => finish(false)
      const timer = setTimeout(() => finish(false), CLONE_READY_TIMEOUT_MS)
      clone.addEventListener('loadedmetadata', onMeta)
      clone.addEventListener('loadeddata', onReady)
      clone.addEventListener('seeked', onReady)
      clone.addEventListener('error', onError)
      // Already-loaded clone won't re-fire these events; kick it synchronously.
      if (clone.readyState >= 1) {
        seekToLive()
        onReady()
      }
    })
  }

  private async removeRule(): Promise<void> {
    if (this.ruleId === null) {
      return
    }
    const ruleId = this.ruleId
    this.ruleId = null
    try {
      await chromeRpcClient.occlusionRemoveCorsRule({ ruleId })
    } catch {
      // Best-effort; a leaked rule only re-adds one ACAO header for the session.
    }
  }
}

export interface CloneCapture {
  setup(): Promise<HTMLVideoElement | null>
  sync(): void
  dispose(): void
}

/**
 * Reads a tainted cross-origin video through a CORS-bypassed clone. Setup runs
 * in the background so the capture loop keeps ticking, which means the first
 * acquires report pending and the outcome lands on a later one.
 */
export class CloneFrameStrategy implements FrameStrategy {
  private capture: CloneCapture | null = null
  private clone: HTMLVideoElement | null = null
  private settingUp = false
  private failure: FrameFailure | null = null
  private disposed = false

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly createCapture: (
      video: HTMLVideoElement
    ) => CloneCapture = (v) => new CrossOriginCapture(v)
  ) {}

  acquire(): Promise<AcquireResult> {
    return Promise.resolve(this.next())
  }

  dispose(): void {
    this.disposed = true
    this.capture?.dispose()
    this.capture = null
    this.clone = null
  }

  private next(): AcquireResult {
    if (this.failure) {
      return { status: 'failed', failure: this.failure }
    }
    const clone = this.clone
    if (clone) {
      this.capture?.sync()
      // A seek started by sync() leaves the pre-seek picture decoded.
      if (clone.readyState < 2) {
        return { status: 'pending' }
      }
      return {
        status: 'frame',
        frame: { element: clone, mediaTime: clone.currentTime },
      }
    }
    if (!this.settingUp) {
      this.startSetup()
    }
    return { status: 'pending' }
  }

  private startSetup(): void {
    this.settingUp = true
    const capture = this.createCapture(this.video)
    this.capture = capture
    const settle = (clone: HTMLVideoElement | null) => {
      this.settingUp = false
      if (this.disposed) {
        capture.dispose()
        return
      }
      if (!clone) {
        this.fail({ kind: 'unavailable', evidence: 'clone-failed' })
        return
      }
      const readability = probeReadability(clone)
      if (readability === 'readable') {
        this.clone = clone
        return
      }
      if (readability === 'tainted') {
        this.fail({ kind: 'protected', evidence: 'clone-tainted' })
        return
      }
      this.fail({ kind: 'unavailable', evidence: 'clone-failed' })
    }
    // A rejected setup must settle too, or the strategy parks in pending.
    void capture.setup().then(settle, () => settle(null))
  }

  private fail(failure: FrameFailure): void {
    this.capture?.dispose()
    this.capture = null
    this.failure = failure
  }
}
