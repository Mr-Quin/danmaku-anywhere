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
// The clone has to fetch a remote file and seek it to the live playhead, which
// takes far longer than a local load on a slow CDN. The capture loop keeps
// running while this is pending, so a generous budget costs nothing.
const CLONE_READY_TIMEOUT_MS = 30_000
// A failed recovery is usually transient (a slow or rate-limited CDN), so back
// off and try again before declaring the video unreadable. One entry per retry.
const RECOVERY_RETRY_DELAYS_MS = [1_000, 3_000, 8_000]

/**
 * Reads a tainted cross-origin video via a hidden crossorigin clone (a
 * background DNR rule supplies ACAO and drops the Origin header) instead of the
 * live element, leaving playback untouched. The caller only builds one for an
 * http(s) source.
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
      // Deliberately not synced here: seeking drops readyState below 2, and the
      // caller has to probe a decoded frame to tell readable from tainted. The
      // first read syncs instead.
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

// 'taint' = the video is protected and no clone can read it. 'unreadable' = the
// clone kept failing, so recovery is given up on. Both tell the caller to
// disable. null = nothing to capture yet (recovering, backing off, or the loop
// moved on).
export type ReadResult = HTMLVideoElement | 'taint' | 'unreadable' | null

/**
 * Answers "what element do I read frames from, and is it readable?" for one
 * video. Probes the live element; on a cross-origin taint it recovers through a
 * CORS-bypassed clone, retrying with backoff because a first failure is usually
 * the network rather than the video. Recovery runs in the background so the
 * capture loop is never blocked waiting for it. The result is cached until the
 * video's src changes or the source is reset. The probe, clone and clock are
 * injectable so the resolution logic is testable without a DOM.
 */
export class FrameSource {
  private capture: CloneCapture | null = null
  private captureEl: HTMLVideoElement | null = null
  // src the capture was resolved against; a change forces a re-resolve.
  private resolvedSrc: string | null = null
  private recovering = false
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
      return this.captureEl
    }
    if (this.recovering) {
      return null
    }
    // Mid-swap the element has no src and no decoded frame yet. Probing then
    // reads as unreadable and would classify a perfectly good video.
    if (video.readyState < 2 || !video.currentSrc) {
      return null
    }
    this.resolvedSrc = video.currentSrc
    if (this.deps.isOriginClean(video)) {
      this.captureEl = video
      return video
    }
    if (!/^https?:/i.test(video.currentSrc)) {
      // blob/MSE sources are never tainted, so an unreadable one is protected
      // (DRM) and no clone can recover it.
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
    this.capture = null
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
    void recovery.setup().then((clone) => {
      if (generation !== this.generation) {
        recovery.dispose()
        return
      }
      this.recovering = false
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
      if (clone && clone.readyState >= 2) {
        // The clone decoded a frame and still reads tainted: the video is
        // protected. A clone without a frame proves nothing, so it retries.
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
    })
  }
}
