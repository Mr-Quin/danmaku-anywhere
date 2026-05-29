import * as ort from 'onnxruntime-web/webgpu'

/**
 * Throwaway harness (anime prototype) to judge IS-Net-Anime quality + latency in
 * the extension origin via onnxruntime-web WebGPU. Not shipped. Model + ort wasm
 * are loaded from local (gitignored) public/ assets via chrome.runtime.getURL.
 */

const SIZE = 1024
const MODEL_URL = chrome.runtime.getURL('models/anime-isnet.onnx')

const logEl = document.getElementById('log') as HTMLDivElement
const srcCanvas = document.getElementById('src') as HTMLCanvasElement
const maskCanvas = document.getElementById('mask') as HTMLCanvasElement
const overlayCanvas = document.getElementById('overlay') as HTMLCanvasElement

function log(msg: string) {
  logEl.textContent += `\n${msg}`
}

let session: ort.InferenceSession | undefined

async function getSession(): Promise<ort.InferenceSession> {
  if (session) {
    return session
  }
  ort.env.wasm.wasmPaths = chrome.runtime.getURL('ort/')
  const t0 = performance.now()
  const buf = await (await fetch(MODEL_URL)).arrayBuffer()
  log(`model fetched ${(buf.byteLength / 1e6).toFixed(1)}MB`)
  session = await ort.InferenceSession.create(buf, {
    executionProviders: ['webgpu'],
  })
  log(
    `session ready in ${(performance.now() - t0).toFixed(0)}ms\ninputs=${session.inputNames}\noutputs=${session.outputNames}`
  )
  return session
}

function preprocess(img: HTMLImageElement | ImageBitmap): Float32Array {
  const c = document.createElement('canvas')
  c.width = SIZE
  c.height = SIZE
  const ctx = c.getContext('2d')
  if (!ctx) {
    throw new Error('no ctx')
  }
  ctx.drawImage(img, 0, 0, SIZE, SIZE)
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE)
  // NCHW, RGB, (x/255 - 0.5) per preprocessor_config (mean 0.5, std 1.0).
  const out = new Float32Array(3 * SIZE * SIZE)
  const plane = SIZE * SIZE
  for (let i = 0; i < plane; i++) {
    out[i] = data[i * 4] / 255 - 0.5
    out[plane + i] = data[i * 4 + 1] / 255 - 0.5
    out[2 * plane + i] = data[i * 4 + 2] / 255 - 0.5
  }
  return out
}

function renderMask(raw: Float32Array, w: number, h: number) {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const v of raw) {
    if (v < min) {
      min = v
    }
    if (v > max) {
      max = v
    }
  }
  // ISNet outputs unbounded logits; normalize then sigmoid-ish via min-max.
  const span = max - min || 1
  maskCanvas.width = w
  maskCanvas.height = h
  overlayCanvas.width = w
  overlayCanvas.height = h
  const mctx = maskCanvas.getContext('2d')
  if (!mctx) {
    return
  }
  const mimg = mctx.createImageData(w, h)
  const prob = new Float32Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    const v = (raw[i] - min) / span
    prob[i] = v
    const g = Math.round(v * 255)
    mimg.data[i * 4] = g
    mimg.data[i * 4 + 1] = g
    mimg.data[i * 4 + 2] = g
    mimg.data[i * 4 + 3] = 255
  }
  mctx.putImageData(mimg, 0, 0)
  return prob
}

function renderOverlay(prob: Float32Array, w: number, h: number) {
  const octx = overlayCanvas.getContext('2d')
  if (!octx) {
    return
  }
  octx.drawImage(srcCanvas, 0, 0, w, h)
  const ov = octx.getImageData(0, 0, w, h)
  for (let i = 0; i < prob.length; i++) {
    // dim background (prob low) to show what would be kept as "subject".
    if (prob[i] < 0.5) {
      ov.data[i * 4] = Math.round(ov.data[i * 4] * 0.25)
      ov.data[i * 4 + 1] = Math.round(ov.data[i * 4 + 1] * 0.25)
      ov.data[i * 4 + 2] = Math.round(ov.data[i * 4 + 2] * 0.25)
    }
  }
  octx.putImageData(ov, 0, 0)
}

async function run(img: HTMLImageElement | ImageBitmap) {
  const s = await getSession()
  srcCanvas.width = SIZE
  srcCanvas.height = SIZE
  srcCanvas.getContext('2d')?.drawImage(img, 0, 0, SIZE, SIZE)

  const input = preprocess(img)
  const tensor = new ort.Tensor('float32', input, [1, 3, SIZE, SIZE])
  const feeds: Record<string, ort.Tensor> = {}
  feeds[s.inputNames[0]] = tensor
  const t0 = performance.now()
  const result = await s.run(feeds)
  const ms = performance.now() - t0
  const out = result[s.outputNames[0]]
  const data = out.data as Float32Array
  const [, , h, w] = out.dims as number[]
  log(`inference ${ms.toFixed(0)}ms, output dims=${out.dims}`)
  const prob = renderMask(data, w, h)
  if (prob) {
    renderOverlay(prob, w, h)
  }
}

document.getElementById('run')?.addEventListener('click', () => {
  const url = (document.getElementById('url') as HTMLInputElement).value.trim()
  if (!url) {
    return
  }
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    void run(img)
  }
  img.onerror = () => log(`image load failed (CORS?): ${url}`)
  img.src = url
})

document.getElementById('file')?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) {
    return
  }
  const bitmap = await createImageBitmap(file)
  void run(bitmap)
})

// Exposed for the MCP harness to drive with a fetched ImageBitmap.
Object.assign(window, { __animeRun: run })

void getSession().catch((err) => log(`init failed: ${err}`))
