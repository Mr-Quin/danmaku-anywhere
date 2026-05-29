import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'

/**
 * Segmenter host page, loaded as a chrome-extension:// iframe inside the host
 * video page. Being an extension-origin, single-world document, the ML runtimes
 * (MediaPipe wasm loader, onnxruntime-web) work here (no isolated/main world
 * split) under the extension CSP ('wasm-unsafe-eval'), and `new Worker`/getURL
 * are same-origin. The content script drives it via postMessage and transferable
 * ImageBitmaps. Two engines: 'mediapipe' (selfie, people) and 'anime' (ISNet via
 * onnxruntime-web WebGPU). Both return a category mask where subject => 0.
 */

const CHANNEL = 'occlusion'
// The bundled selfie model's PERSON category is index 0 (verified empirically;
// inverted from some docs). confidenceMasks[0] is the per-pixel person prob.
const PERSON_CATEGORY = 0
const ANIME_SIZE = 1024

type Engine = 'mediapipe' | 'anime'

type ReadyMsg = { __da: typeof CHANNEL; type: 'ready' }
type Reply = {
  __da: typeof CHANNEL
  type: string
  ok?: boolean
  [k: string]: unknown
}

let segmenter: ImageSegmenter | undefined
let lastTimestamp = 0

// Lazily imported only when the anime engine is selected (keeps ort-web out of
// the default path).
let animeSession: import('onnxruntime-web/webgpu').InferenceSession | undefined
let ortRef: typeof import('onnxruntime-web/webgpu') | undefined
const animeCanvas = new OffscreenCanvas(ANIME_SIZE, ANIME_SIZE)

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

async function initAnime() {
  const ort = await import('onnxruntime-web/webgpu')
  ortRef = ort
  ort.env.wasm.wasmPaths = chrome.runtime.getURL('ort/')
  const buf = await (
    await fetch(chrome.runtime.getURL('models/anime-isnet.onnx'))
  ).arrayBuffer()
  animeSession = await ort.InferenceSession.create(buf, {
    executionProviders: ['webgpu'],
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

async function segmentAnime(bitmap: ImageBitmap, threshold: number) {
  const ort = ortRef
  if (!animeSession || !ort) {
    throw new Error('anime session not initialized')
  }
  const ctx = animeCanvas.getContext('2d')
  if (!ctx) {
    throw new Error('no offscreen ctx')
  }
  ctx.drawImage(bitmap, 0, 0, ANIME_SIZE, ANIME_SIZE)
  const { data } = ctx.getImageData(0, 0, ANIME_SIZE, ANIME_SIZE)
  const plane = ANIME_SIZE * ANIME_SIZE
  const input = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    input[i] = data[i * 4] / 255 - 0.5
    input[plane + i] = data[i * 4 + 1] / 255 - 0.5
    input[2 * plane + i] = data[i * 4 + 2] / 255 - 0.5
  }
  const tensor = new ort.Tensor('float32', input, [
    1,
    3,
    ANIME_SIZE,
    ANIME_SIZE,
  ])
  const feeds: Record<string, import('onnxruntime-web/webgpu').Tensor> = {}
  feeds[animeSession.inputNames[0]] = tensor
  const out = (await animeSession.run(feeds))[animeSession.outputNames[0]]
  const logits = out.data as Float32Array
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const v of logits) {
    if (v < min) {
      min = v
    }
    if (v > max) {
      max = v
    }
  }
  const span = max - min || 1
  // ISNet outputs a subject saliency map. Subject => 0 (hidden), bg => 1, to
  // match the mediapipe convention downstream.
  const bytes = new Uint8Array(logits.length)
  for (let i = 0; i < logits.length; i++) {
    bytes[i] = (logits[i] - min) / span >= threshold ? 0 : 1
  }
  return { dims: { w: ANIME_SIZE, h: ANIME_SIZE }, bytes }
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
      const engine = (msg.engine as Engine) ?? 'mediapipe'
      if (engine === 'anime') {
        await initAnime()
      } else {
        await initMediapipe()
      }
      reply({ type: 'init', ok: true })
      return
    }
    if (msg.type === 'segment') {
      const bitmap = msg.bitmap as ImageBitmap
      const threshold = typeof msg.threshold === 'number' ? msg.threshold : 0.5
      const { dims, bytes } = animeSession
        ? await segmentAnime(bitmap, threshold)
        : segmentMediapipe(bitmap, threshold)
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
