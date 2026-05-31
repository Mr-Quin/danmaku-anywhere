import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'

/**
 * Segmenter host page, loaded as a chrome-extension:// iframe inside the host
 * video page. Being an extension-origin, single-world document, the MediaPipe
 * wasm runtime works here (no isolated/main world split) under the extension
 * CSP ('wasm-unsafe-eval'), and `new Worker`/getURL are same-origin. The content
 * script drives it via postMessage and transferable ImageBitmaps. Returns a
 * category mask where person => 0 (hidden), background => 1 (shown).
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

async function initMediapipe() {
  if (segmenter) {
    return
  }
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

function segmentMediapipe(bitmap: ImageBitmap, threshold: number) {
  if (!segmenter) {
    throw new Error('segmenter not initialized')
  }
  lastTimestamp = Math.max(Math.round(performance.now()), lastTimestamp + 1)
  const result = segmenter.segmentForVideo(bitmap, lastTimestamp)
  if (!result) {
    throw new Error('segmentation produced no result')
  }
  try {
    const mask = result.confidenceMasks?.[PERSON_CATEGORY]
    if (!mask) {
      throw new Error('no confidence mask')
    }
    const dims = { w: mask.width, h: mask.height }
    const conf = mask.getAsFloat32Array()
    const bytes = new Uint8Array(dims.w * dims.h)
    for (let i = 0; i < conf.length; i++) {
      bytes[i] = conf[i] >= threshold ? 0 : 1
    }
    return { dims, bytes }
  } finally {
    for (const m of result.confidenceMasks ?? []) {
      m.close()
    }
    result.close()
  }
}

window.addEventListener('message', async (e: MessageEvent) => {
  if (e.source !== window.parent) {
    return
  }
  const msg = e.data
  if (!msg || msg.__da !== CHANNEL) {
    return
  }
  const source = e.source as Window | null
  const targetOrigin = e.origin || '*'
  const reply = (m: Omit<Reply, '__da'>, transfer: Transferable[] = []) => {
    source?.postMessage({ __da: CHANNEL, ...m }, targetOrigin, transfer)
  }
  try {
    if (msg.type === 'init') {
      await initMediapipe()
      reply({ type: 'init', ok: true })
      return
    }
    if (msg.type === 'segment') {
      const bitmap = msg.bitmap as ImageBitmap | undefined
      if (!bitmap) {
        reply({
          type: 'segment',
          id: msg.id,
          ok: false,
          error: 'missing bitmap',
        })
        return
      }
      const threshold = typeof msg.threshold === 'number' ? msg.threshold : 0.5
      try {
        const { dims, bytes } = segmentMediapipe(bitmap, threshold)
        reply({ type: 'segment', id: msg.id, ok: true, dims, bytes }, [
          bytes.buffer,
        ])
      } finally {
        bitmap.close()
      }
      return
    }
  } catch (err) {
    reply({ type: msg.type, id: msg.id, ok: false, error: String(err) })
  }
})

const readyMsg: ReadyMsg = { __da: CHANNEL, type: 'ready' }
window.parent?.postMessage(readyMsg, '*')
