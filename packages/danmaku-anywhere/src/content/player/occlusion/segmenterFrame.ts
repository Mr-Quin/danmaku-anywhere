import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'

/**
 * Segmenter host page, loaded as a chrome-extension:// iframe
 * inside the host video page. Being an extension-origin, single-world document,
 * MediaPipe's wasm-loader <script> injects into THIS document and registers in
 * the same scope (no isolated/main world split), runs under the extension CSP
 * ('wasm-unsafe-eval'), and `new Worker`/getURL are same-origin here. The
 * content script drives it via postMessage and transferable ImageBitmaps.
 */

const CHANNEL = 'occlusion'
// The bundled selfie model's PERSON category is index 0 (verified empirically;
// inverted from some docs). confidenceMasks[0] is the per-pixel person prob.
const PERSON_CATEGORY = 0

type ReadyMsg = { __da: typeof CHANNEL; type: 'ready' }
type Reply = {
  __da: typeof CHANNEL
  type: string
  ok?: boolean
  [k: string]: unknown
}

let segmenter: ImageSegmenter | undefined
let lastTimestamp = 0

async function init() {
  const wasmBase = chrome.runtime.getURL('mediapipe/wasm')
  const modelPath = chrome.runtime.getURL(
    'mediapipe/models/selfie_segmenter.tflite'
  )
  const fileset = await FilesetResolver.forVisionTasks(wasmBase)
  segmenter = await ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: modelPath, delegate: 'GPU' },
    runningMode: 'VIDEO',
    outputConfidenceMasks: true,
  })
}

window.addEventListener('message', async (e: MessageEvent) => {
  const msg = e.data
  if (!msg || msg.__da !== CHANNEL) {
    return
  }
  const source = e.source as Window | null
  const reply = (m: Omit<Reply, '__da'>, transfer: Transferable[] = []) => {
    source?.postMessage({ __da: CHANNEL, ...m }, '*', transfer)
  }
  try {
    if (msg.type === 'init') {
      await init()
      reply({ type: 'init', ok: true })
      return
    }
    if (msg.type === 'segment') {
      if (!segmenter) {
        throw new Error('segmenter not initialized')
      }
      const t0 = performance.now()
      // VIDEO-mode timestamps must strictly increase or segmentForVideo throws.
      lastTimestamp = Math.max(t0, lastTimestamp + 1)
      const result = segmenter.segmentForVideo(
        msg.bitmap as ImageBitmap,
        lastTimestamp
      )
      const mask = result.confidenceMasks?.[PERSON_CATEGORY]
      const dims = { w: mask?.width ?? 0, h: mask?.height ?? 0 }
      const threshold = typeof msg.threshold === 'number' ? msg.threshold : 0.5
      // getAsFloat32Array reads the per-pixel person confidence back to CPU;
      // threshold here (person => 0, background => 1) so only a small Uint8
      // mask is transferred, not the floats.
      const conf = mask?.getAsFloat32Array()
      const bytes = new Uint8Array(dims.w * dims.h)
      if (conf) {
        for (let i = 0; i < conf.length; i++) {
          bytes[i] = conf[i] >= threshold ? 0 : 1
        }
      }
      for (const m of result.confidenceMasks ?? []) {
        m.close()
      }
      result.close()
      ;(msg.bitmap as ImageBitmap).close()
      reply({ type: 'segment', ok: true, dims, bytes }, [bytes.buffer])
      return
    }
  } catch (err) {
    reply({ type: msg.type, ok: false, error: String(err) })
  }
})

const readyMsg: ReadyMsg = { __da: CHANNEL, type: 'ready' }
window.parent?.postMessage(readyMsg, '*')
