// Copy MediaPipe tasks-vision wasm assets into public/ so they ship UNHASHED
// (FilesetResolver requests them by exact name from a directory URL) and are
// served from the extension origin via chrome.runtime.getURL, never from a CDN
// (MV3 forbids remote code).
//
// The .tflite model is NOT in the npm package; vendor it into
// public/mediapipe/models/ separately (committed binary or a setup download).

import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(here, '..')
const require = createRequire(path.join(pkgRoot, 'package.json'))

const visionPkgDir = path.dirname(require.resolve('@mediapipe/tasks-vision'))
const wasmSrcDir = path.join(visionPkgDir, 'wasm')
const wasmDestDir = path.join(pkgRoot, 'public', 'mediapipe', 'wasm')

const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]

fs.mkdirSync(wasmDestDir, { recursive: true })
fs.mkdirSync(path.join(pkgRoot, 'public', 'mediapipe', 'models'), {
  recursive: true,
})

for (const file of WASM_FILES) {
  const src = path.join(wasmSrcDir, file)
  if (!fs.existsSync(src)) {
    throw new Error(`missing MediaPipe wasm asset: ${src}`)
  }
  fs.copyFileSync(src, path.join(wasmDestDir, file))
  console.log(`copied mediapipe/wasm/${file}`)
}
