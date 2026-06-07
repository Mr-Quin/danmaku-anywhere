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
const CLONE_READY_TIMEOUT_MS = 8000

/**
 * Reads a tainted cross-origin video via a hidden crossorigin clone (a
 * background DNR rule supplies ACAO) instead of the live element, leaving
 * playback untouched. http(s) only: blob/MSE aren't tainted, DRM never readable.
 */
export class CrossOriginCapture {
  private clone: HTMLVideoElement | null = null
  private ruleId: number | null = null
  private disposed = false

  constructor(private readonly original: HTMLVideoElement) {}

  async setup(): Promise<HTMLVideoElement | null> {
    const src = this.original.currentSrc
    if (!/^https?:/i.test(src)) {
      return null
    }

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
      this.sync()
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
