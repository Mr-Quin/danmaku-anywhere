import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { ModelEntry } from '@/common/models/schema'
import { buildAlphaMask } from './maskGeometry'
import {
  type IMaskProviderFactory,
  MaskProviderFactory,
} from './maskProviderFactory'
import type { MaskProvider } from './types'

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
}

const DEFAULT_CAPTURE_SIZE = 256
const DEFAULT_MIN_INTERVAL_MS = 80
const DEFAULT_OUTPUT_MAX_SIDE = 320
const DEBUG_Z_INDEX = '2147483646'

// The bundled selfie_segmenter's category mask marks the PERSON as category 0
// and the background as non-zero (verified empirically against the shipped
// model; inverted from some MediaPipe docs). Danmaku hide where the person is,
// so person pixels become transparent (alpha 0) in the mask.
function isPerson(value: number): boolean {
  return value === 0
}

function modelKey(descriptor: ModelEntry): string {
  return `${descriptor.id}|${descriptor.url ?? ''}|${descriptor.sha256 ?? ''}`
}

/**
 * Drives a per-frame person-mask loop for one video and applies the resulting
 * alpha mask (as a data URL) to the danmaku overlay so comments render behind
 * people. Capture and mask application live here (co-located with the video and
 * overlay); inference is delegated to a MaskProvider created per model.
 */
@injectable('Singleton')
export class OcclusionService {
  private video: HTMLVideoElement | null = null
  private running = false
  private busy = false
  private lastSegmentTs = 0
  private readonly maskCanvas = document.createElement('canvas')
  private readonly rawMaskCanvas = document.createElement('canvas')
  private readonly maskCtx: CanvasRenderingContext2D | null
  private readonly rawMaskCtx: CanvasRenderingContext2D | null
  private readonly logger: ILogger
  private provider?: MaskProvider
  // Identity of the model behind the live provider. Includes the download source
  // so a manifest refresh that re-points the same id rebuilds the provider.
  private currentModelKey?: string
  // Replaced by configure(); a no-op until then.
  private applyMask: (url?: string) => void = () => undefined
  private onStatus?: (status: OcclusionStatus) => void
  private captureSize = DEFAULT_CAPTURE_SIZE
  private capturePreserveAspect = false
  private minIntervalMs = DEFAULT_MIN_INTERVAL_MS
  private outputMaxSide = DEFAULT_OUTPUT_MAX_SIDE
  private threshold = 0.5
  private edgeSoftness = 0
  private debug = false
  private debugView?: OcclusionDebugView
  private appliedOnce = false
  private imageData?: ImageData
  private callbackId: number | null = null
  private fps: number | null = null
  private lastError: string | null = null
  private lastStatusReason?: OcclusionStatusReason
  private lastAppliedTs = 0

  constructor(
    @inject(MaskProviderFactory)
    private readonly createProvider: IMaskProviderFactory,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.maskCtx = this.maskCanvas.getContext('2d')
    this.rawMaskCtx = this.rawMaskCanvas.getContext('2d')
    this.logger = logger.sub('[OcclusionService]')
  }

  configure(config: OcclusionConfig): void {
    this.applyMask = config.applyMask
    this.onStatus = config.onStatus
    this.captureSize = config.captureSize
    this.capturePreserveAspect = config.capturePreserveAspect
    this.minIntervalMs = config.minIntervalMs
    this.outputMaxSide = config.outputMaxSide
    this.threshold = config.threshold
    this.edgeSoftness = config.edgeSoftness
    this.setDebug(config.debug)
    const key = modelKey(config.descriptor)
    if (key !== this.currentModelKey) {
      this.stop()
      this.provider?.dispose?.()
      this.provider = this.createProvider(config.descriptor)
      this.currentModelKey = key
    }
  }

  setDebug(debug: boolean): void {
    if (debug === this.debug) {
      return
    }
    this.debug = debug
    if (!debug) {
      this.debugView?.remove()
      this.debugView = undefined
    }
  }

  private log(message: string): void {
    this.logger.debug(message)
  }

  private status(reason: OcclusionStatusReason, message: string): void {
    this.lastError = message
    this.log(message)
    // The capture loop can hit the same gate (e.g. 'segment') every frame; only
    // surface a reason once until it changes or a frame succeeds, so a persistent
    // failure does not spam the same toast.
    if (reason !== this.lastStatusReason) {
      this.lastStatusReason = reason
      this.onStatus?.({ reason, message })
    }
  }

  getStats(): OcclusionStats {
    return {
      running: this.running,
      fps: this.fps,
      lastError: this.lastError,
      debugOverlay: this.debug,
    }
  }

  start(video: HTMLVideoElement): void {
    if (this.running && this.video === video) {
      return
    }
    this.stop()
    if (!this.provider) {
      return
    }
    // requestVideoFrameCallback drives the loop; the flag is synced storage and
    // can reach a browser without it, so treat absence as "unavailable" rather
    // than throwing during danmaku mount.
    if (typeof video.requestVideoFrameCallback !== 'function') {
      this.status(
        'unavailable',
        'start skipped: requestVideoFrameCallback unavailable'
      )
      return
    }
    this.lastError = null
    this.lastStatusReason = undefined
    this.fps = null
    this.lastAppliedTs = 0
    this.video = video
    this.running = true
    this.log('starting')
    void this.run()
  }

  stop(): void {
    if (this.video && this.callbackId !== null) {
      this.video.cancelVideoFrameCallback(this.callbackId)
    }
    this.callbackId = null
    this.running = false
    this.video = null
    this.lastSegmentTs = 0
    this.busy = false
    this.appliedOnce = false
    this.fps = null
    this.lastAppliedTs = 0
    this.applyMask(undefined)
    this.debugView?.remove()
    this.debugView = undefined
  }

  reset(): void {
    this.stop()
    this.provider?.dispose?.()
    this.provider = undefined
    this.currentModelKey = undefined
  }

  private async run(): Promise<void> {
    const provider = this.provider
    const video = this.video
    if (!provider) {
      return
    }
    // A hosted model (anime) downloads on first use; announce it once so a long
    // first-run wait is not a silent hang. Informational, so it bypasses the
    // lastError-setting status() path.
    let announcedDownload = false
    provider.onDownloadProgress = (_loaded, total) => {
      if (announcedDownload) {
        return
      }
      announcedDownload = true
      const mb = total ? Math.round(total / 1_000_000) : null
      const message = mb ? `downloading model (~${mb} MB)` : 'downloading model'
      this.log(message)
      this.onStatus?.({ reason: 'downloading', message })
    }
    try {
      await provider.init()
    } catch (e) {
      // Init failed (wasm/model load, WebGPU unavailable). Give up for now
      // without breaking playback; a later start() can retry a fresh provider.
      if (this.video === video) {
        this.running = false
      }
      const detail = e instanceof Error ? e.message : String(e)
      const reason = /webgpu/i.test(detail) ? 'webgpu' : 'init'
      this.status(reason, `provider init failed: ${detail}`)
      return
    } finally {
      provider.onDownloadProgress = undefined
    }
    if (!this.running || this.video !== video) {
      return
    }
    this.log('provider ready, capturing')
    this.scheduleFrame()
  }

  private scheduleFrame(): void {
    const video = this.video
    if (!this.running || !video) {
      return
    }
    this.callbackId = video.requestVideoFrameCallback(() => {
      this.callbackId = null
      void this.onFrame()
    })
  }

  private async onFrame(): Promise<void> {
    const video = this.video
    if (!this.running || !video) {
      return
    }
    const now = performance.now()
    const ready =
      !video.paused &&
      video.readyState >= 2 &&
      document.visibilityState === 'visible'

    if (!ready) {
      // Reset the fps seed so a pause/hidden gap is not counted as one huge
      // frame interval when capture resumes.
      this.lastAppliedTs = 0
    }

    if (ready && !this.busy && now - this.lastSegmentTs >= this.minIntervalMs) {
      this.lastSegmentTs = now
      this.busy = true
      try {
        await this.segmentAndApply(video)
      } catch (e) {
        // Transient capture/segment failure: keep the last mask, keep looping.
        this.log(`frame failed: ${e instanceof Error ? e.message : e}`)
      } finally {
        this.busy = false
      }
    }
    this.scheduleFrame()
  }

  private async segmentAndApply(video: HTMLVideoElement): Promise<void> {
    const maskCtx = this.maskCtx
    const rawMaskCtx = this.rawMaskCtx
    const provider = this.provider
    if (!maskCtx || !rawMaskCtx || !provider) {
      return
    }

    const t0 = performance.now()
    let resizeWidth = this.captureSize
    let resizeHeight = this.captureSize
    if (
      this.capturePreserveAspect &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      const aspect = video.videoWidth / video.videoHeight
      if (aspect >= 1) {
        resizeHeight = Math.max(1, Math.round(this.captureSize / aspect))
      } else {
        resizeWidth = Math.max(1, Math.round(this.captureSize * aspect))
      }
    }
    let frame: ImageBitmap
    try {
      // Resize on the GPU during decode; avoids a main-thread canvas draw.
      frame = await createImageBitmap(video, {
        resizeWidth,
        resizeHeight,
        resizeQuality: 'medium',
      })
    } catch (e) {
      // Cross-origin-without-CORS or DRM/EME video taints the canvas; reading it
      // back is impossible, so disable for this video instead of retrying.
      if (e instanceof DOMException && e.name === 'SecurityError') {
        this.debugView?.showDisabled('disabled (tainted canvas)')
        // status() must run after stop(): stop clears running/fps but the status
        // sets lastError, which must survive.
        this.stop()
        this.status(
          'taint',
          'disabled: video canvas is tainted (cross-origin/DRM)'
        )
        return
      }
      this.log(`capture failed: ${e instanceof Error ? e.message : e}`)
      return
    }

    if (!this.running || this.video !== video) {
      frame.close()
      return
    }
    const result = await provider.segment(frame, {
      threshold: this.threshold,
    })
    if (!result) {
      this.status(
        'segment',
        'segment returned no result (provider failed or timed out)'
      )
      return
    }
    if (!this.running || this.video !== video) {
      return
    }

    const box = { width: video.clientWidth, height: video.clientHeight }
    if (box.width === 0 || box.height === 0) {
      this.log('video box has zero size; skipping')
      return
    }
    const content = {
      width: video.videoWidth || box.width,
      height: video.videoHeight || box.height,
    }
    const outputScale = Math.min(
      1,
      this.outputMaxSide / Math.max(box.width, box.height)
    )

    const mask = buildAlphaMask({
      category: result.category,
      maskSize: result.maskSize,
      content,
      box,
      outputScale,
      isPerson,
    })

    if (
      this.maskCanvas.width !== mask.width ||
      this.maskCanvas.height !== mask.height ||
      !this.imageData
    ) {
      this.maskCanvas.width = mask.width
      this.maskCanvas.height = mask.height
      this.rawMaskCanvas.width = mask.width
      this.rawMaskCanvas.height = mask.height
      this.imageData = rawMaskCtx.createImageData(mask.width, mask.height)
    }
    this.imageData.data.set(mask.data)
    rawMaskCtx.putImageData(this.imageData, 0, 0)

    maskCtx.clearRect(0, 0, mask.width, mask.height)
    maskCtx.filter =
      this.edgeSoftness > 0 ? `blur(${this.edgeSoftness}px)` : 'none'
    maskCtx.drawImage(this.rawMaskCanvas, 0, 0)
    maskCtx.filter = 'none'

    if (!this.running || this.video !== video) {
      return
    }
    this.applyMask(this.maskCanvas.toDataURL('image/png'))
    this.lastError = null
    this.lastStatusReason = undefined
    const appliedAt = performance.now()
    if (this.lastAppliedTs > 0) {
      const dt = appliedAt - this.lastAppliedTs
      const instantFps = dt > 0 ? 1000 / dt : 0
      this.fps =
        this.fps === null ? instantFps : this.fps * 0.7 + instantFps * 0.3
    }
    this.lastAppliedTs = appliedAt
    if (!this.appliedOnce) {
      this.appliedOnce = true
      this.log(
        `first mask applied (${mask.width}x${mask.height}) in ${Math.round(appliedAt - t0)}ms`
      )
    }

    if (this.debug) {
      this.renderDebug(video, mask, result.maskSize, performance.now() - t0)
    }
  }

  private renderDebug(
    video: HTMLVideoElement,
    mask: { data: Uint8ClampedArray; width: number; height: number },
    sourceSize: { width: number; height: number },
    cycleMs: number
  ): void {
    if (!this.debugView) {
      this.debugView = new OcclusionDebugView()
    }
    let personPixels = 0
    for (let i = 3; i < mask.data.length; i += 4) {
      if (mask.data[i] === 0) {
        personPixels++
      }
    }
    const total = mask.width * mask.height
    const personFraction = total > 0 ? personPixels / total : 0
    this.debugView.update({
      rect: video.getBoundingClientRect(),
      mask,
      sourceSize,
      cycleMs,
      personFraction,
    })
  }
}

interface DebugUpdate {
  rect: DOMRect
  mask: { data: Uint8ClampedArray; width: number; height: number }
  sourceSize: { width: number; height: number }
  cycleMs: number
  personFraction: number
}

/**
 * Visible debug overlay (debug mode only): tints the detected person region over
 * the video and prints timing / coverage so the segmentation can be seen and
 * profiled. Owns its own DOM in the host page; removed on stop / debug-off.
 */
class OcclusionDebugView {
  private readonly root = document.createElement('div')
  private readonly canvas = document.createElement('canvas')
  private readonly label = document.createElement('div')
  private readonly ctx: CanvasRenderingContext2D | null

  constructor() {
    this.root.style.cssText = `position:fixed;z-index:${DEBUG_Z_INDEX};pointer-events:none;outline:1px solid rgba(0,255,128,0.6);`
    this.canvas.style.cssText = 'width:100%;height:100%;display:block;'
    this.label.style.cssText =
      'position:absolute;top:0;left:0;padding:2px 6px;font:11px monospace;color:#0f8;background:rgba(0,0,0,0.6);white-space:pre;'
    this.root.appendChild(this.canvas)
    this.root.appendChild(this.label)
    document.body.appendChild(this.root)
    this.ctx = this.canvas.getContext('2d')
  }

  update(u: DebugUpdate): void {
    this.root.style.left = `${u.rect.left}px`
    this.root.style.top = `${u.rect.top}px`
    this.root.style.width = `${u.rect.width}px`
    this.root.style.height = `${u.rect.height}px`

    const ctx = this.ctx
    if (ctx) {
      if (
        this.canvas.width !== u.mask.width ||
        this.canvas.height !== u.mask.height
      ) {
        this.canvas.width = u.mask.width
        this.canvas.height = u.mask.height
      }
      const tint = ctx.createImageData(u.mask.width, u.mask.height)
      for (let i = 0; i < u.mask.data.length; i += 4) {
        // mask alpha 0 => person; tint it green, leave background clear.
        const personHere = u.mask.data[i + 3] === 0
        tint.data[i] = 0
        tint.data[i + 1] = 255
        tint.data[i + 2] = 128
        tint.data[i + 3] = personHere ? 110 : 0
      }
      ctx.putImageData(tint, 0, 0)
    }

    const fps = u.cycleMs > 0 ? 1000 / u.cycleMs : 0
    const coverage = `${Math.round(u.personFraction * 100)}%`
    const detected = u.personFraction < 0.005 ? ' (no person detected)' : ''
    this.label.textContent = `occlusion ${u.cycleMs.toFixed(0)}ms ~${fps.toFixed(0)}fps\nsrc ${u.sourceSize.width}x${u.sourceSize.height} person ${coverage}${detected}`
  }

  showDisabled(message: string): void {
    this.label.textContent = message
  }

  remove(): void {
    this.root.remove()
  }
}
