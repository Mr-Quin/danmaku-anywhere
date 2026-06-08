import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(here, '..')
const require = createRequire(path.join(pkgRoot, 'package.json'))

/**
 * Runtime wasm vendored from node_modules into public/ so it ships UNHASHED and
 * loads from the extension origin (MV3 forbids remote code). To bundle a new
 * runtime, add a group here. Nothing in package.json changes. Models are not
 * bundled (see modelRegistry: hosted and cached in OPFS).
 */
interface AssetGroup {
  /** Package name, for the not-found error message. */
  readonly label: string
  readonly resolveSrcDir: () => string
  /** Destination under public/. */
  readonly destDir: string
  readonly files: readonly string[]
}

const ASSET_GROUPS: readonly AssetGroup[] = [
  {
    label: '@mediapipe/tasks-vision',
    resolveSrcDir: () =>
      path.join(
        path.dirname(require.resolve('@mediapipe/tasks-vision')),
        'wasm'
      ),
    destDir: 'mediapipe/wasm',
    // The build targets (chrome89+/firefox89+) all support SIMD, so
    // FilesetResolver always picks the SIMD build; the no-SIMD fallback is dead
    // weight.
    files: ['vision_wasm_internal.js', 'vision_wasm_internal.wasm'],
  },
  {
    label: 'onnxruntime-web',
    resolveSrcDir: () => path.dirname(require.resolve('onnxruntime-web')),
    destDir: 'ort',
    // The extern-wasm webgpu build (ort.webgpu.min.mjs, selected by the resolve
    // condition in vite.config) loads only the asyncify pair via the wasmPaths
    // override; the plain and jsep variants are never fetched.
    files: [
      'ort-wasm-simd-threaded.asyncify.wasm',
      'ort-wasm-simd-threaded.asyncify.mjs',
    ],
  },
]

function vendor(): void {
  const publicDir = path.join(pkgRoot, 'public')
  for (const group of ASSET_GROUPS) {
    const srcDir = group.resolveSrcDir()
    const destDir = path.join(publicDir, group.destDir)
    // Wipe first so a trimmed file list does not leave stale runtimes behind to
    // ship in the build (these dirs hold only vendored assets).
    fs.rmSync(destDir, { recursive: true, force: true })
    fs.mkdirSync(destDir, { recursive: true })
    for (const file of group.files) {
      const src = path.join(srcDir, file)
      if (!fs.existsSync(src)) {
        throw new Error(
          `vendorRuntimeAssets: missing ${group.label} asset ${src}`
        )
      }
      fs.copyFileSync(src, path.join(destDir, file))
    }
  }
}

export function vendorRuntimeAssets(): Plugin {
  return {
    name: 'vendor-runtime-assets',
    // buildStart fires for `vite build` and on `vite` dev-server start, but not
    // for vitest, so the vendoring runs exactly where the build needs it.
    buildStart() {
      vendor()
    },
  }
}
