import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { ModelEntry } from '@/common/models/schema'
import { FrameSource } from './frameSource'
import { MaskCompositor } from './MaskCompositor'
import type { Mask } from './maskGeometry'
import {
  type IMaskProviderFactory,
  MaskProviderFactory,
} from './maskProviderFactory'
import type {
  OcclusionConfig,
  OcclusionStats,
  OcclusionStatus,
  OcclusionStatusReason,
} from './Occlusion.types'
import { OcclusionDebugView } from './OcclusionDebugView'
import type { MaskProvider } from './types'

const DEFAULT_CAPTURE_SIZE = 256
const DEFAULT_MIN_INTERVAL_MS = 80
const DEFAULT_OUTPUT_MAX_SIDE = 320

function modelKey(descriptor: ModelEntry): string {
  // Every load-bearing field (inputSize, preprocessing, capture, source) must
  // rebuild the provider when it changes, so key on the whole descriptor.
  return JSON.stringify(descriptor)
}

/**
 * Drives a per-frame person-mask loop for one video and applies the resulting
 * alpha mask (as a data URL) to the danmaku overlay so comments render behind
 * people. A FrameSource resolves the readable element, a MaskProvider runs
 * inference, and a MaskCompositor turns the result into the applied mask; this
 * service is the lifecycle and per-frame coordinator.
 */
@injectable('Singleton')
export class OcclusionService {
  private video: HTMLVideoElement | null = null
  private running = false
  private busy = false
  private lastSegmentTs = 0
  private readonly logger: ILogger
  private readonly frameSource: FrameSource
  private readonly compositor: MaskCompositor
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
    this.logger = logger.sub('[OcclusionService]')
    this.frameSource = new FrameSource((message) => this.log(message))
    this.compositor = new MaskCompositor((message) => this.log(message))
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
    this.frameSource.reset()
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
    const provider = this.provider
    if (!provider) {
      return
    }
    const isStale = () => !this.running || this.video !== video

    const source = await this.frameSource.read(video, isStale)
    if (source === 'taint') {
      this.disableForTaint()
      return
    }
    if (!source || isStale()) {
      return
    }

    const t0 = performance.now()
    const frame = await this.captureFrame(source, video)
    if (frame === 'taint') {
      this.disableForTaint()
      return
    }
    if (!frame) {
      return
    }
    if (isStale()) {
      frame.close()
      return
    }

    const result = await provider.segment(frame, { threshold: this.threshold })
    if (!result) {
      this.status(
        'segment',
        'segment returned no result (provider failed or timed out)'
      )
      return
    }
    if (isStale()) {
      return
    }

    const composed = this.compositor.compose(result, video, {
      outputMaxSide: this.outputMaxSide,
      edgeSoftness: this.edgeSoftness,
    })
    if (!composed || isStale()) {
      return
    }

    this.applyMask(composed.url)
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
      const { width, height } = composed.mask
      this.log(
        `first mask applied (${width}x${height}) in ${Math.round(appliedAt - t0)}ms`
      )
    }

    if (this.debug) {
      this.renderDebug(
        video,
        composed.mask,
        result.maskSize,
        performance.now() - t0
      )
    }
  }

  // createImageBitmap resizes on the GPU during decode, avoiding a main-thread
  // canvas draw. Returns 'taint' when the source is unreadable (some engines
  // throw here even though the upfront probe usually catches it first).
  private async captureFrame(
    source: HTMLVideoElement,
    video: HTMLVideoElement
  ): Promise<ImageBitmap | 'taint' | null> {
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
    try {
      return await createImageBitmap(source, {
        resizeWidth,
        resizeHeight,
        resizeQuality: 'medium',
      })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'SecurityError') {
        return 'taint'
      }
      this.log(`capture failed: ${e instanceof Error ? e.message : e}`)
      return null
    }
  }

  private disableForTaint(): void {
    this.debugView?.showDisabled('disabled (tainted canvas)')
    // status() must run after stop(): stop clears running/fps but the status
    // sets lastError, which must survive.
    this.stop()
    this.status('taint', 'disabled: video canvas is tainted (cross-origin/DRM)')
  }

  private renderDebug(
    video: HTMLVideoElement,
    mask: Mask,
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
