import type { ModelRuntime } from './modelRegistry'
import type { MaskProvider, SegmentationResult, SegmentOptions } from './types'

const CHANNEL = 'occlusion'
const INIT_TIMEOUT_MS = 20_000
const SEGMENT_TIMEOUT_MS = 8_000

/**
 * Runs the MediaPipe segmenter in a hidden chrome-extension:// iframe injected
 * into the page. The iframe is an extension-origin, single-world document, so
 * the wasm runtime works (no isolated/main world split) under the extension CSP
 * even on strict-CSP hosts, and the model loads from local web-accessible
 * assets (no remote code). Frames go in and masks come back as transferable
 * buffers over postMessage.
 */
export class IframeMaskProvider implements MaskProvider {
  private iframe?: HTMLIFrameElement
  private ready?: Promise<void>
  private nextId = 0
  private readonly origin = new URL(chrome.runtime.getURL('')).origin
  // Settles for in-flight init/segment promises, so dispose() unblocks any
  // pending caller and clears its listener + timer instead of leaking them
  // until the timeout.
  private readonly cleanups = new Set<() => void>()

  constructor(private readonly runtime: ModelRuntime) {}

  init(): Promise<void> {
    if (!this.ready) {
      // Reset on failure so a later attempt (e.g. a new video) can retry.
      this.ready = this.create().catch((e) => {
        this.dispose()
        throw e
      })
    }
    return this.ready
  }

  private create(): Promise<void> {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.cssText =
        'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;'
      iframe.src = chrome.runtime.getURL('pages/segmenter.html')
      this.iframe = iframe

      let timer: ReturnType<typeof setTimeout>
      const settle = (err?: Error) => {
        window.removeEventListener('message', onMessage)
        clearTimeout(timer)
        this.cleanups.delete(cleanup)
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }
      const cleanup = () => settle(new Error('disposed'))
      this.cleanups.add(cleanup)
      const onMessage = (e: MessageEvent) => {
        if (e.source !== iframe.contentWindow || e.data?.__da !== CHANNEL) {
          return
        }
        if (e.data.type === 'ready') {
          iframe.contentWindow?.postMessage(
            { __da: CHANNEL, type: 'init', runtime: this.runtime },
            this.origin
          )
          return
        }
        if (e.data.type === 'init') {
          settle(
            e.data.ok ? undefined : new Error(`segmenter init: ${e.data.error}`)
          )
        }
      }
      timer = setTimeout(
        () => settle(new Error('segmenter init timed out')),
        INIT_TIMEOUT_MS
      )
      window.addEventListener('message', onMessage)
      // The player content script runs at document_start, so document.body may
      // not exist yet; documentElement always does.
      ;(document.body ?? document.documentElement).append(iframe)
    })
  }

  segment(
    frame: ImageBitmap,
    options?: SegmentOptions
  ): Promise<SegmentationResult | null> {
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      const target = this.iframe?.contentWindow
      if (!target) {
        frame.close()
        resolve(null)
        return
      }
      let settled = false
      let timer: ReturnType<typeof setTimeout>
      const finish = (result: SegmentationResult | null, err?: Error) => {
        if (settled) {
          return
        }
        settled = true
        window.removeEventListener('message', onMessage)
        clearTimeout(timer)
        this.cleanups.delete(cleanup)
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      }
      const cleanup = () => finish(null)
      this.cleanups.add(cleanup)
      // A timed-out request stops listening, so a late reply must not satisfy
      // a newer request; match on the per-request id.
      const onMessage = (e: MessageEvent) => {
        if (
          e.source !== this.iframe?.contentWindow ||
          e.data?.__da !== CHANNEL ||
          e.data.type !== 'segment' ||
          e.data.id !== id
        ) {
          return
        }
        if (!e.data.ok) {
          finish(null, new Error(`segmenter failed: ${e.data.error}`))
          return
        }
        if (!e.data.bytes) {
          finish(null)
          return
        }
        finish({
          category: e.data.bytes as Uint8Array,
          maskSize: { width: e.data.dims.w, height: e.data.dims.h },
        })
      }
      timer = setTimeout(() => finish(null), SEGMENT_TIMEOUT_MS)
      window.addEventListener('message', onMessage)
      try {
        target.postMessage(
          {
            __da: CHANNEL,
            type: 'segment',
            id,
            bitmap: frame,
            threshold: options?.threshold,
          },
          this.origin,
          [frame]
        )
      } catch (err) {
        frame.close()
        finish(null, err as Error)
      }
    })
  }

  dispose(): void {
    for (const cleanup of [...this.cleanups]) {
      cleanup()
    }
    this.cleanups.clear()
    this.iframe?.remove()
    this.iframe = undefined
    this.ready = undefined
  }
}
