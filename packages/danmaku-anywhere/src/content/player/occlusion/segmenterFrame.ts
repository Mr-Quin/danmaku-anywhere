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
  lastTimestamp = Math.max(performance.now(), lastTimestamp + 1)
  const result = segmenter.segmentForVideo(bitmap, lastTimestamp)
  const mask = result.confidenceMasks?.[PERSON_CATEGORY]
  const dims = { w: mask?.width ?? 0, h: mask?.height ?? 0 }
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
  return { dims, bytes }
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
      await initMediapipe()
      reply({ type: 'init', ok: true })
      return
    }
    if (msg.type === 'segment') {
      const bitmap = msg.bitmap as ImageBitmap
      const threshold = typeof msg.threshold === 'number' ? msg.threshold : 0.5
      const { dims, bytes } = segmentMediapipe(bitmap, threshold)
      bitmap.close()
      reply({ type: 'segment', ok: true, dims, bytes }, [bytes.buffer])
      return
    }
  } catch (err) {
    reply({ type: msg.type, ok: false, error: String(err) })
  }
})

const readyMsg: ReadyMsg = { __da: CHANNEL, type: 'ready' }
window.parent?.postMessage(readyMsg, '*')
