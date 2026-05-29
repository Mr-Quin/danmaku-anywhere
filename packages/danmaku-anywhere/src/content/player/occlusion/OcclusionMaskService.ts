import { buildAlphaMask } from './maskGeometry'
import type { MaskProvider } from './types'

export interface OcclusionMaskOptions {
  captureSize?: number
  minIntervalMs?: number
  outputMaxSide?: number
  isPerson?: (value: number) => boolean
}

const DEFAULT_CAPTURE_SIZE = 256
const DEFAULT_MIN_INTERVAL_MS = 80
const DEFAULT_OUTPUT_MAX_SIDE = 320

// The bundled selfie_segmenter's category mask marks the PERSON as category 0
// and the background as non-zero (verified empirically against the shipped
// model; this is inverted from some MediaPipe docs). Danmaku are hidden where
// the person is, so person pixels become transparent (alpha 0) in the mask.
function defaultIsPerson(value: number): boolean {
  return value === 0
}

/**
 * Drives a per-frame person-mask loop for one video and applies the resulting
 * alpha mask (as a data URL) to the danmaku overlay so comments render behind
 * people. Capture and mask application live in the content script (co-located
 * with the video and overlay); inference is delegated to the MaskProvider.
 */
export class OcclusionMaskService {
  private video: HTMLVideoElement | null = null
  private running = false
  private busy = false
  private lastSegmentTs = 0
  private readonly captureCanvas = document.createElement('canvas')
  private readonly maskCanvas = document.createElement('canvas')
  private readonly captureCtx: CanvasRenderingContext2D | null
  private readonly maskCtx: CanvasRenderingContext2D | null

  constructor(
    private readonly provider: MaskProvider,
    private readonly applyMask: (url?: string) => void,
    private readonly options: OcclusionMaskOptions = {}
  ) {
    this.captureCanvas.width = options.captureSize ?? DEFAULT_CAPTURE_SIZE
    this.captureCanvas.height = this.captureCanvas.width
    this.captureCtx = this.captureCanvas.getContext('2d')
    this.maskCtx = this.maskCanvas.getContext('2d')
  }

  start(video: HTMLVideoElement): void {
    if (this.running && this.video === video) {
      return
    }
    this.stop()
    // requestVideoFrameCallback drives the loop; the flag is synced storage and
    // can reach a browser without it, so treat absence as "unavailable" rather
    // than throwing during danmaku mount.
    if (typeof video.requestVideoFrameCallback !== 'function') {
      return
    }
    this.video = video
    this.running = true
    void this.run()
  }

  stop(): void {
    this.running = false
    this.video = null
    this.lastSegmentTs = 0
    this.applyMask(undefined)
  }

  dispose(): void {
    this.stop()
    this.provider.dispose()
  }

  private async run(): Promise<void> {
    try {
      await this.provider.init()
    } catch {
      // Init failed (wasm/model load, WebGL unavailable). Give up for now
      // without breaking playback; a later start() can retry a fresh provider.
      this.running = false
      return
    }
    this.scheduleFrame()
  }

  private scheduleFrame(): void {
    const video = this.video
    if (!this.running || !video) {
      return
    }
    video.requestVideoFrameCallback(() => {
      void this.onFrame()
    })
  }

  private async onFrame(): Promise<void> {
    const video = this.video
    if (!this.running || !video) {
      return
    }
    const now = performance.now()
    const interval = this.options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS
    const ready =
      !video.paused &&
      video.readyState >= 2 &&
      document.visibilityState === 'visible'

    if (ready && !this.busy && now - this.lastSegmentTs >= interval) {
      this.lastSegmentTs = now
      this.busy = true
      try {
        await this.segmentAndApply(video)
      } catch {
        // Transient capture/segment failure: keep the last mask, keep looping.
      } finally {
        this.busy = false
      }
    }
    this.scheduleFrame()
  }

  private async segmentAndApply(video: HTMLVideoElement): Promise<void> {
    const captureCtx = this.captureCtx
    const maskCtx = this.maskCtx
    if (!captureCtx || !maskCtx) {
      return
    }

    const captureSize = this.captureCanvas.width
    let frame: ImageBitmap
    try {
      captureCtx.drawImage(video, 0, 0, captureSize, captureSize)
      frame = await createImageBitmap(this.captureCanvas)
    } catch (e) {
      // Cross-origin-without-CORS or DRM/EME video taints the canvas; reading it
      // back is impossible, so disable for this video instead of retrying.
      if (e instanceof DOMException && e.name === 'SecurityError') {
        this.stop()
      }
      return
    }

    const result = await this.provider.segment(frame)
    if (!result || !this.running) {
      return
    }

    const box = { width: video.clientWidth, height: video.clientHeight }
    if (box.width === 0 || box.height === 0) {
      return
    }
    const content = {
      width: video.videoWidth || box.width,
      height: video.videoHeight || box.height,
    }
    const maxSide = this.options.outputMaxSide ?? DEFAULT_OUTPUT_MAX_SIDE
    const outputScale = Math.min(1, maxSide / Math.max(box.width, box.height))

    const mask = buildAlphaMask({
      category: result.category,
      maskSize: result.maskSize,
      content,
      box,
      outputScale,
      isPerson: this.options.isPerson ?? defaultIsPerson,
    })

    if (
      this.maskCanvas.width !== mask.width ||
      this.maskCanvas.height !== mask.height
    ) {
      this.maskCanvas.width = mask.width
      this.maskCanvas.height = mask.height
    }
    const imageData = maskCtx.createImageData(mask.width, mask.height)
    imageData.data.set(mask.data)
    maskCtx.putImageData(imageData, 0, 0)

    if (this.running) {
      this.applyMask(this.maskCanvas.toDataURL('image/png'))
    }
  }
}
