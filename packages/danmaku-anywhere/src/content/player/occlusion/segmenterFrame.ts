import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import type { InferenceSession, Tensor } from 'onnxruntime-web/webgpu'
import { fetchAndCacheFile } from '@/common/storage/opfsFileCache'
import { getModel, type ModelRuntime } from './modelRegistry'

/**
 * Segmenter host page, loaded as a chrome-extension:// iframe inside the host
 * video page. Being an extension-origin, single-world document, the ML runtimes
 * (MediaPipe wasm loader, onnxruntime-web) work here (no isolated/main world
 * split) under the extension CSP ('wasm-unsafe-eval'), and `new Worker`/getURL
 * are same-origin. The content script drives it via postMessage and transferable
 * ImageBitmaps. Two runtimes: 'mediapipe' (selfie, people) and 'ort' (ISNet via
 * onnxruntime-web WebGPU, anime). Both return a category mask where the subject
 * => 0 (hidden), background => 1 (shown).
 */

const CHANNEL = 'occlusion'
// The bundled selfie model's PERSON category is index 0 (verified empirically;
// inverted from some docs). confidenceMasks[0] is the per-pixel person prob.
const PERSON_CATEGORY = 0
const ANIME_INPUT_SIZE = getModel('anime').inputSize
// Above this subject coverage the anime detection is treated as degenerate and
// suppressed, so a bad frame does not hide every danmaku.
const MAX_SUBJECT_FRACTION = 0.9

type ReadyMsg = { __da: typeof CHANNEL; type: 'ready' }
type Reply = {
  __da: typeof CHANNEL
  type: string
  ok?: boolean
  [k: string]: unknown
}

let runtime: ModelRuntime | undefined
let segmenter: ImageSegmenter | undefined
let lastTimestamp = 0

// Lazily imported only when the 'ort' runtime is selected (keeps onnxruntime-web
// off the default 'mediapipe' path).
let ortRef: typeof import('onnxruntime-web/webgpu') | undefined
let animeSession: InferenceSession | undefined
let animeCanvas: OffscreenCanvas | undefined

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

async function initAnime(
  onProgress?: (loaded: number, total: number | null) => void
) {
  if (animeSession) {
    return
  }
  if (!navigator.gpu) {
    throw new Error('WebGPU is unavailable; the anime model requires WebGPU')
  }
  const descriptor = getModel('anime')
  if (!descriptor.url) {
    throw new Error('anime model url is not configured')
  }
  const ort = await import('onnxruntime-web/webgpu')
  ortRef = ort
  ort.env.wasm.wasmPaths = chrome.runtime.getURL('ort/')
  // Cache-bust by content hash so a re-uploaded model at the same path is never
  // served stale from a CDN edge cache (each version is a distinct URL).
  const url = descriptor.sha256
    ? `${descriptor.url}?v=${descriptor.sha256}`
    : descriptor.url
  const bytes = await fetchAndCacheFile({
    id: 'anime-isnet',
    url,
    sha256: descriptor.sha256,
    onProgress: onProgress
      ? (progress) => {
          return onProgress(progress.loaded, progress.total)
        }
      : undefined,
  })
  animeSession = await ort.InferenceSession.create(bytes, {
    executionProviders: ['webgpu'],
  })
  animeCanvas = new OffscreenCanvas(ANIME_INPUT_SIZE, ANIME_INPUT_SIZE)
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

async function segmentAnime(bitmap: ImageBitmap, threshold: number) {
  const ort = ortRef
  if (!animeSession || !ort || !animeCanvas) {
    throw new Error('anime session not initialized')
  }
  const ctx = animeCanvas.getContext('2d')
  if (!ctx) {
    throw new Error('no offscreen 2d context')
  }
  const size = ANIME_INPUT_SIZE
  // Letterbox the frame into the square input: preserve aspect ratio, center,
  // pad with black. ISNet is trained on undistorted, padded input, so stretching
  // to square (and the wrong normalization) degrades the mask.
  const scale = Math.min(size / bitmap.width, size / bitmap.height)
  const contentW = Math.max(1, Math.round(bitmap.width * scale))
  const contentH = Math.max(1, Math.round(bitmap.height * scale))
  const offsetX = Math.floor((size - contentW) / 2)
  const offsetY = Math.floor((size - contentH) / 2)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(bitmap, offsetX, offsetY, contentW, contentH)
  const { data } = ctx.getImageData(0, 0, size, size)
  const plane = size * size
  const input = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    input[i] = data[i * 4] / 255
    input[plane + i] = data[i * 4 + 1] / 255
    input[2 * plane + i] = data[i * 4 + 2] / 255
  }
  const tensor = new ort.Tensor('float32', input, [1, 3, size, size])
  const feeds: Record<string, Tensor> = {
    [animeSession.inputNames[0]]: tensor,
  }
  const output = (await animeSession.run(feeds))[animeSession.outputNames[0]]
  const mask = output.data as Float32Array
  if (mask.length !== plane) {
    throw new Error(
      `anime model output ${output.dims.join('x')} does not match input ${size}x${size}`
    )
  }
  // The output is already a [0,1] foreground alpha. Crop back to the letterboxed
  // content (drop the padding) and threshold directly: subject => 0 (hidden),
  // background => 1 (shown), matching the mediapipe convention downstream.
  const bytes = new Uint8Array(contentW * contentH)
  let subject = 0
  for (let y = 0; y < contentH; y++) {
    const srcRow = (offsetY + y) * size + offsetX
    const dstRow = y * contentW
    for (let x = 0; x < contentW; x++) {
      const hidden = mask[srcRow + x] >= threshold
      if (hidden) {
        subject++
      }
      bytes[dstRow + x] = hidden ? 0 : 1
    }
  }
  // Degenerate guard: when the model flags almost the entire frame as subject
  // (an over-confident or confused detection), masking every pixel would hide
  // all danmaku on screen. Emit no mask instead so danmaku stay visible.
  if (subject > bytes.length * MAX_SUBJECT_FRACTION) {
    bytes.fill(1)
  }
  return { dims: { w: contentW, h: contentH }, bytes }
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
      runtime = msg.runtime === 'ort' ? 'ort' : 'mediapipe'
      if (runtime === 'ort') {
        await initAnime((loaded, total) => {
          reply({ type: 'progress', loaded, total })
        })
      } else {
        await initMediapipe()
      }
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
        const { dims, bytes } =
          runtime === 'ort'
            ? await segmentAnime(bitmap, threshold)
            : segmentMediapipe(bitmap, threshold)
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
