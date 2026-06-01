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
    files: [
      'vision_wasm_internal.js',
      'vision_wasm_internal.wasm',
      'vision_wasm_nosimd_internal.js',
      'vision_wasm_nosimd_internal.wasm',
    ],
  },
  {
    label: 'onnxruntime-web',
    resolveSrcDir: () => path.dirname(require.resolve('onnxruntime-web')),
    destDir: 'ort',
    files: [
      'ort-wasm-simd-threaded.wasm',
      'ort-wasm-simd-threaded.mjs',
      'ort-wasm-simd-threaded.jsep.wasm',
      'ort-wasm-simd-threaded.jsep.mjs',
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
