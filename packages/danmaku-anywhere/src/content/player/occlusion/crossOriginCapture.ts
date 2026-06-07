import { chromeRpcClient } from '@/common/rpcClient/background/client'

// A cross-origin video loaded without CORS taints the capture canvas, so the
// segmenter cannot read its frames. createImageBitmap does not reliably throw on
// such a video (the taint only surfaces at the later pixel read), so probe with
// an actual getImageData and treat SecurityError as the taint signal.
export function isVideoOriginClean(video: HTMLVideoElement): boolean {
  // drawImage is a no-op on a video with no decoded frame, which would let
  // getImageData read a blank canvas and falsely report clean; require a frame.
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
 * Recovers frame capture for a tainted cross-origin video. A background DNR rule
 * injects `Access-Control-Allow-Origin: *` onto the media URL; a hidden
 * `crossorigin="anonymous"` clone of the same source then loads origin-clean and
 * is captured instead of the live element, so the user's playback is untouched.
 * Only direct http(s) sources are recoverable (not blob/MSE, which is already
 * origin-clean, nor DRM, which is never readable).
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
      // A failed RPC / rule install must not leave capture half-resolved; give
      // up cleanly so the caller falls through to the tainted-canvas status
      // instead of capturing the unrecovered (tainted) original forever.
      this.dispose()
      return null
    }
  }

  // Keep the clone aligned with the live element so the captured frame matches
  // what the user sees; called once per capture cycle.
  sync(): void {
    const clone = this.clone
    if (!clone) {
      return
    }
    const target = this.original.currentTime
    // Match rate first; otherwise a non-1x original drifts continuously and
    // triggers a corrective seek every cycle.
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
      // readyState dips while seeking, so gate on a decoded frame being present
      // rather than the event firing, to avoid reporting ready mid-seek.
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
      // A cached/fast clone may already be past these events, which won't fire
      // again; drive the seek and readiness check synchronously.
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
      // Best-effort cleanup; a stale session rule only re-adds one harmless ACAO
      // header and is cleared when the browser session ends.
    }
  }
}
