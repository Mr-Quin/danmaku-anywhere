import { chromeRpcClient } from '@/common/rpcClient/background/client'

// createImageBitmap doesn't reliably throw on a tainted video (the taint
// surfaces only at the later pixel read), so probe with getImageData.
export function isVideoOriginClean(video: HTMLVideoElement): boolean {
  // No decoded frame: drawImage no-ops and getImageData would read clean.
  if (video.readyState < 2) {
    return false
  }
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return true
  }
  try {
    ctx.drawImage(video, 0, 0, 2, 2)
    ctx.getImageData(0, 0, 1, 1)
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'SecurityError') {
      return false
    }
    return true
  }
}

const DRIFT_TOLERANCE_SECONDS = 0.2
// Every attempt loads the media again, hence the short retry list.
const CLONE_READY_TIMEOUT_MS = 20_000
const RECOVERY_RETRY_DELAYS_MS = [2_000, 6_000]

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

export interface FrameSourceDeps {
  isOriginClean: (video: HTMLVideoElement) => boolean
  createCapture: (video: HTMLVideoElement) => CloneCapture
  now: () => number
}

const defaultDeps: FrameSourceDeps = {
  isOriginClean: isVideoOriginClean,
  createCapture: (video) => new CrossOriginCapture(video),
  now: () => performance.now(),
}

// 'taint' = protected, no clone can read it. 'unreadable' = recovery kept
// failing. Both tell the caller to disable. null = nothing to capture yet.
export type ReadResult = HTMLVideoElement | 'taint' | 'unreadable' | null

/**
 * Answers "what element do I read frames from, and is it readable?" for one
 * video. Probes the live element; on a cross-origin taint it recovers through a
 * CORS-bypassed clone in the background, retrying with backoff. The result is
 * cached until the video's src changes or the source is reset. The probe, clone
 * and clock are injectable so the resolution logic is testable without a DOM.
 */
export class FrameSource {
  private capture: CloneCapture | null = null
  private captureEl: HTMLVideoElement | null = null
  // src the capture was resolved against; a change forces a re-resolve.
  private resolvedSrc: string | null = null
  private recovering = false
  private pending: CloneCapture | null = null
  private attempts = 0
  private nextAttemptAt = 0
  private verdict: 'taint' | 'unreadable' | null = null
  // Bumped on reset so a recovery that outlives it cannot install its clone.
  private generation = 0
  private readonly deps: FrameSourceDeps

  constructor(
    private readonly log: (message: string) => void,
    deps: Partial<FrameSourceDeps> = {}
  ) {
    this.deps = { ...defaultDeps, ...deps }
  }

  // isStale lets the caller abort a recovery whose async clone setup outlived
  // the capture loop (stopped or switched video), so a late clone isn't leaked.
  async read(
    video: HTMLVideoElement,
    isStale: () => boolean
  ): Promise<ReadResult> {
    if (this.resolvedSrc !== null && this.resolvedSrc !== video.currentSrc) {
      this.reset()
    }
    if (this.verdict) {
      return this.verdict
    }
    if (this.captureEl) {
      this.capture?.sync()
      // A seek started by sync() leaves the pre-seek picture decoded.
      if (this.captureEl.readyState < 2) {
        return null
      }
      return this.captureEl
    }
    if (this.recovering) {
      return null
    }
    // Mid-swap there is nothing to probe, and probing reads as unreadable.
    if (video.readyState < 2 || !video.currentSrc) {
      return null
    }
    this.resolvedSrc = video.currentSrc
    if (this.deps.isOriginClean(video)) {
      this.captureEl = video
      return video
    }
    // Nothing to re-fetch, or nothing readable to re-fetch.
    if (!/^https?:/i.test(video.currentSrc) || video.mediaKeys) {
      this.verdict = 'taint'
      return 'taint'
    }
    if (this.deps.now() < this.nextAttemptAt) {
      return null
    }
    this.startRecovery(video, isStale)
    return null
  }

  reset(): void {
    this.generation++
    this.capture?.dispose()
    this.pending?.dispose()
    this.capture = null
    this.pending = null
    this.captureEl = null
    this.resolvedSrc = null
    this.recovering = false
    this.attempts = 0
    this.nextAttemptAt = 0
    this.verdict = null
  }

  private startRecovery(video: HTMLVideoElement, isStale: () => boolean): void {
    this.recovering = true
    this.attempts++
    const generation = this.generation
    const recovery = this.deps.createCapture(video)
    this.pending = recovery
    const settle = (clone: HTMLVideoElement | null) => {
      if (generation !== this.generation) {
        recovery.dispose()
        return
      }
      this.recovering = false
      this.pending = null
      if (isStale()) {
        recovery.dispose()
        return
      }
      if (clone && this.deps.isOriginClean(clone)) {
        this.capture = recovery
        this.captureEl = clone
        this.log('cross-origin video recovered via CORS-bypassed clone')
        return
      }
      recovery.dispose()
      // A clone without a decoded frame proves nothing, so it retries instead.
      if (clone && clone.readyState >= 2) {
        this.verdict = 'taint'
        return
      }
      const delay = RECOVERY_RETRY_DELAYS_MS[this.attempts - 1]
      if (delay === undefined) {
        this.verdict = 'unreadable'
        this.log(
          `cross-origin recovery failed ${this.attempts} times, giving up`
        )
        return
      }
      this.nextAttemptAt = this.deps.now() + delay
      this.log(`cross-origin recovery failed, retrying in ${delay}ms`)
    }
    // A rejected setup must settle too, or the source parks with no status.
    void recovery.setup().then(settle, (e) => {
      this.log(
        `cross-origin recovery threw: ${e instanceof Error ? e.message : e}`
      )
      settle(null)
    })
  }
}
