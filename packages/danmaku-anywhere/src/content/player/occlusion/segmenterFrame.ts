import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import type { InferenceSession, Tensor } from 'onnxruntime-web/webgpu'
import { type ModelEntry, modelDownloadUrl } from '@/common/models/schema'
import { fetchAndCacheFile } from '@/common/storage/opfsFileCache'

/**
 * Segmenter host page, loaded as a chrome-extension:// iframe inside the host
 * video page. Being an extension-origin, single-world document, the ML runtimes
 * (MediaPipe wasm loader, onnxruntime-web) work here (no isolated/main world
 * split) under the extension CSP ('wasm-unsafe-eval'), and `new Worker`/getURL
 * are same-origin. The content script drives it via postMessage and transferable
 * ImageBitmaps, passing the full resolved model descriptor in `init`. Two
 * runtimes: 'mediapipe' (selfie, people) and 'ort' (onnxruntime-web WebGPU, any
 * hosted ORT model). Both return a category mask where the subject => 0
 * (hidden), background => 1 (shown).
 */

const CHANNEL = 'occlusion'
// The bundled selfie model's PERSON category is index 0 (verified empirically;
// inverted from some docs). confidenceMasks[0] is the per-pixel person prob.
const PERSON_CATEGORY = 0
// Above this subject coverage an ORT detection is treated as degenerate and
// suppressed, so a bad frame does not hide every danmaku.
const MAX_SUBJECT_FRACTION = 0.9
// Standard ImageNet normalization (RGB order), used when preprocessing.normalize
// is 'imagenet'.
const IMAGENET_MEAN = [0.485, 0.456, 0.406]
const IMAGENET_STD = [0.229, 0.224, 0.225]

type ReadyMsg = { __da: typeof CHANNEL; type: 'ready' }
type Reply = {
  __da: typeof CHANNEL
  type: string
  ok?: boolean
  [k: string]: unknown
}

let descriptor: ModelEntry | undefined
let segmenter: ImageSegmenter | undefined
let lastTimestamp = 0

// Lazily imported only when an 'ort' model is selected (keeps onnxruntime-web
// off the default 'mediapipe' path).
let ortRef: typeof import('onnxruntime-web/webgpu') | undefined
let ortSession: InferenceSession | undefined
let ortCanvas: OffscreenCanvas | undefined

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

async function initOrt(
  model: ModelEntry,
  onProgress?: (loaded: number, total: number | null) => void
) {
  if (ortSession) {
    return
  }
  if (model.requiresWebGpu && !navigator.gpu) {
    throw new Error('WebGPU is unavailable; this model requires WebGPU')
  }
  const url = modelDownloadUrl(model)
  if (!url) {
    throw new Error('hosted model url is not configured')
  }
  const ort = await import('onnxruntime-web/webgpu')
  ortRef = ort
  ort.env.wasm.wasmPaths = chrome.runtime.getURL('ort/')
  const bytes = await fetchAndCacheFile({
    id: model.id,
    url,
    sha256: model.sha256,
    onProgress: onProgress
      ? (progress) => {
          return onProgress(progress.loaded, progress.total)
        }
      : undefined,
  })
  ortSession = await ort.InferenceSession.create(bytes, {
    executionProviders: ['webgpu'],
  })
  ortCanvas = new OffscreenCanvas(model.inputSize, model.inputSize)
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

function buildOrtInput(
  model: ModelEntry,
  data: Uint8ClampedArray
): Float32Array {
  const size = model.inputSize
  const plane = size * size
  const input = new Float32Array(3 * plane)
  const { normalize, layout, channelOrder } = model.preprocessing
  // Source pixels are RGBA; map to the model's channel order. IMAGENET_MEAN/STD
  // are in source (rgb) order, so they are indexed by the source channel, not
  // the destination, to stay correct under a bgr channelOrder.
  const srcChannel = channelOrder === 'bgr' ? [2, 1, 0] : [0, 1, 2]
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      const src = srcChannel[c]
      const raw = data[i * 4 + src] / 255
      const value =
        normalize === 'imagenet'
          ? (raw - IMAGENET_MEAN[src]) / IMAGENET_STD[src]
          : raw
      const index = layout === 'nhwc' ? i * 3 + c : c * plane + i
      input[index] = value
    }
  }
  return input
}

async function segmentOrt(
  model: ModelEntry,
  bitmap: ImageBitmap,
  threshold: number
) {
  const ort = ortRef
  if (!ortSession || !ort || !ortCanvas) {
    throw new Error('ort session not initialized')
  }
  const ctx = ortCanvas.getContext('2d')
  if (!ctx) {
    throw new Error('no offscreen 2d context')
  }
  const size = model.inputSize
  // Letterbox the frame into the square input: preserve aspect ratio, center,
  // pad with black. ISNet-family models are trained on undistorted, padded
  // input, so stretching to square degrades the mask.
  const scale = Math.min(size / bitmap.width, size / bitmap.height)
  const contentW = Math.max(1, Math.round(bitmap.width * scale))
  const contentH = Math.max(1, Math.round(bitmap.height * scale))
  const offsetX = Math.floor((size - contentW) / 2)
  const offsetY = Math.floor((size - contentH) / 2)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(bitmap, offsetX, offsetY, contentW, contentH)
  const { data } = ctx.getImageData(0, 0, size, size)
  const input = buildOrtInput(model, data)
  const dims =
    model.preprocessing.layout === 'nhwc'
      ? [1, size, size, 3]
      : [1, 3, size, size]
  const tensor = new ort.Tensor('float32', input, dims)
  const feeds: Record<string, Tensor> = {
    [ortSession.inputNames[0]]: tensor,
  }
  const output = (await ortSession.run(feeds))[ortSession.outputNames[0]]
  const foreground = readForeground(model, output, size)
  // Crop back to the letterboxed content (drop the padding) and threshold:
  // subject => 0 (hidden), background => 1 (shown), matching the mediapipe
  // convention downstream.
  const bytes = new Uint8Array(contentW * contentH)
  let subject = 0
  for (let y = 0; y < contentH; y++) {
    const srcRow = (offsetY + y) * size + offsetX
    const dstRow = y * contentW
    for (let x = 0; x < contentW; x++) {
      const hidden = foreground[srcRow + x] >= threshold
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

function readForeground(
  model: ModelEntry,
  output: Tensor,
  size: number
): Float32Array {
  const data = output.data as Float32Array
  const plane = size * size
  if (model.preprocessing.output === 'argmax') {
    // Reserved by the schema for a future multi-class model. The subject class
    // and output layout are model-specific and undefined here, so reject rather
    // than guess; no shipped model uses argmax.
    throw new Error('argmax output is not supported yet')
  }
  if (data.length !== plane) {
    throw new Error(
      `model output ${output.dims.join('x')} does not match input ${size}x${size}`
    )
  }
  // Already a [0,1] foreground alpha.
  return data
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
      descriptor = msg.descriptor as ModelEntry
      if (descriptor.runtime === 'ort') {
        await initOrt(descriptor, (loaded, total) => {
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
          descriptor?.runtime === 'ort'
            ? await segmentOrt(descriptor, bitmap, threshold)
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
