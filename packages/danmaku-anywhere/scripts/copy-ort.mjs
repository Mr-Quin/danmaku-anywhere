// Copy onnxruntime-web wasm runtime assets into public/ so they ship UNHASHED
// (ORT requests them by exact name relative to wasmPaths) and are served from
// the extension origin via chrome.runtime.getURL, never from a CDN (MV3 forbids
// remote code).
//
// The WebGPU build loads the .jsep variant by default and falls back to
// .asyncify; the base pair backs the plain wasm EP. Each .wasm has a sibling
// .mjs glue loader fetched alongside it.
//
// The .onnx model is NOT in the npm package; vendor it into public/models/
// separately (R2 download or committed binary).

import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(here, '..')
const require = createRequire(path.join(pkgRoot, 'package.json'))

const wasmSrcDir = path.dirname(require.resolve('onnxruntime-web'))
const wasmDestDir = path.join(pkgRoot, 'public', 'ort')

const WASM_FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
  'ort-wasm-simd-threaded.asyncify.mjs',
]

fs.mkdirSync(wasmDestDir, { recursive: true })

for (const file of WASM_FILES) {
  const src = path.join(wasmSrcDir, file)
  if (!fs.existsSync(src)) {
    throw new Error(`missing onnxruntime-web asset: ${src}`)
  }
  fs.copyFileSync(src, path.join(wasmDestDir, file))
  console.log(`copied ort/${file}`)
}
