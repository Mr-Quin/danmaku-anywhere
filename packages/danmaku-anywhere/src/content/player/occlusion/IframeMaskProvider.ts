import type { MaskProvider, SegmentationResult } from './types'

const CHANNEL = 'occlusion'

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
      this.ready = this.create()
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

      const onMessage = (e: MessageEvent) => {
        if (e.source !== iframe.contentWindow || e.data?.__da !== CHANNEL) {
          return
        }
        if (e.data.type === 'ready') {
          this.post({ type: 'init' })
          return
        }
        if (e.data.type === 'init') {
          window.removeEventListener('message', onMessage)
          if (e.data.ok) {
            resolve()
          } else {
            reject(new Error(`segmenter init failed: ${e.data.error}`))
          }
        }
      }
      window.addEventListener('message', onMessage)
      document.body.appendChild(iframe)
    })
  }

  segment(frame: ImageBitmap): Promise<SegmentationResult | null> {
    return new Promise((resolve) => {
      const onMessage = (e: MessageEvent) => {
        if (
          e.source !== this.iframe?.contentWindow ||
          e.data?.__da !== CHANNEL ||
          e.data.type !== 'segment'
        ) {
          return
        }
        window.removeEventListener('message', onMessage)
        if (!e.data.ok || !e.data.bytes) {
          resolve(null)
          return
        }
        resolve({
          category: e.data.bytes as Uint8Array,
          maskSize: { width: e.data.dims.w, height: e.data.dims.h },
        })
      }
      window.addEventListener('message', onMessage)
      this.post({ type: 'segment', bitmap: frame }, [frame])
    })
  }

  private post(msg: Record<string, unknown>, transfer: Transferable[] = []) {
    this.iframe?.contentWindow?.postMessage(
      { __da: CHANNEL, ...msg },
      '*',
      transfer
    )
  }

  dispose(): void {
    this.iframe?.remove()
    this.iframe = undefined
    this.ready = undefined
  }
}
