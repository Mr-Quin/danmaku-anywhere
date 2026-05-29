import type { MaskProvider, SegmentationResult, SegmentOptions } from './types'

const CHANNEL = 'occlusion'
const INIT_TIMEOUT_MS = 15_000
const SEGMENT_TIMEOUT_MS = 5_000

/**
 * Runs MediaPipe ImageSegmenter in a hidden chrome-extension:// iframe injected
 * into the page. The iframe is an extension-origin, single-world document, so
 * MediaPipe's wasm loader works (no isolated/main world split) under the
 * extension CSP even on strict-CSP hosts, and the model loads from local
 * web-accessible assets (no remote code). Frames go in and masks come back as
 * transferable buffers over postMessage.
 */
export class IframeMaskProvider implements MaskProvider {
  private iframe?: HTMLIFrameElement
  private ready?: Promise<void>

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

      const settle = (err?: Error) => {
        window.removeEventListener('message', onMessage)
        clearTimeout(timer)
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }
      const onMessage = (e: MessageEvent) => {
        if (e.source !== iframe.contentWindow || e.data?.__da !== CHANNEL) {
          return
        }
        if (e.data.type === 'ready') {
          iframe.contentWindow?.postMessage(
            { __da: CHANNEL, type: 'init' },
            '*'
          )
          return
        }
        if (e.data.type === 'init') {
          settle(
            e.data.ok ? undefined : new Error(`segmenter init: ${e.data.error}`)
          )
        }
      }
      const timer = setTimeout(
        () => settle(new Error('segmenter init timed out')),
        INIT_TIMEOUT_MS
      )
      window.addEventListener('message', onMessage)
      iframe.addEventListener('error', () =>
        settle(new Error('segmenter frame failed to load'))
      )
      document.body.appendChild(iframe)
    })
  }

  segment(
    frame: ImageBitmap,
    options?: SegmentOptions
  ): Promise<SegmentationResult | null> {
    return new Promise((resolve) => {
      const target = this.iframe?.contentWindow
      if (!target) {
        frame.close()
        resolve(null)
        return
      }
      let settled = false
      let timer: ReturnType<typeof setTimeout>
      const finish = (result: SegmentationResult | null) => {
        if (settled) {
          return
        }
        settled = true
        window.removeEventListener('message', onMessage)
        clearTimeout(timer)
        resolve(result)
      }
      const onMessage = (e: MessageEvent) => {
        if (
          e.source !== this.iframe?.contentWindow ||
          e.data?.__da !== CHANNEL ||
          e.data.type !== 'segment'
        ) {
          return
        }
        if (!e.data.ok || !e.data.bytes) {
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
      target.postMessage(
        {
          __da: CHANNEL,
          type: 'segment',
          bitmap: frame,
          threshold: options?.threshold,
        },
        '*',
        [frame]
      )
    })
  }

  dispose(): void {
    this.iframe?.remove()
    this.iframe = undefined
    this.ready = undefined
  }
}
