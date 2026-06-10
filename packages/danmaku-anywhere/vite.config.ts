import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defaultClientConditions, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { manifest } from './manifest'
import { getBuildContext } from './scripts/getBuildContext'
import { vendorRuntimeAssets } from './scripts/vendorRuntimeAssets'

const { browser, appVersion, isDev, daEnv, gitBranch } = getBuildContext()

const { isChrome, isFirefox } = browser

if (!['chrome', 'firefox'].includes(browser.name)) {
  throw new Error(
    `Browser target must be either 'chrome' or 'firefox', but got ${browser.name}`
  )
}

const defaultPort = isChrome ? 23333 : 23334
const envPort = process.env.VITE_PORT
  ? Number(process.env.VITE_PORT)
  : undefined
const port = envPort && !Number.isNaN(envPort) ? envPort : defaultPort

console.log('Building for', {
  browser,
  appVersion,
  isDev,
  daEnv,
  gitBranch,
})

// E2E builds run without a developer .env (CI and fresh checkouts), but the DNR
// rule that stamps the proxy Origin header rejects undefined values. Inject
// placeholder hosts that Playwright routes intercept; an exported env var (not a
// .env file, which this define overrides) still points an e2e build at a backend.
const e2eProxyDefines =
  daEnv === 'e2e'
    ? {
        'import.meta.env.VITE_PROXY_URL': JSON.stringify(
          process.env.VITE_PROXY_URL || 'https://api.danmaku.test'
        ),
        'import.meta.env.VITE_PROXY_ORIGIN': JSON.stringify(
          process.env.VITE_PROXY_ORIGIN || 'https://danmaku.test'
        ),
      }
    : {}

// Stamps the output with build metadata so the e2e setup can refuse to run
// against a stale or wrong-env build (see e2e/setup/globalSetup.ts). Skipped
// for prod so release zips stay free of branch names and timestamps.
function buildInfo(): Plugin {
  let outDir = ''
  return {
    name: 'da:build-info',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      if (daEnv === 'prod') {
        return
      }
      mkdirSync(outDir, { recursive: true })
      writeFileSync(
        path.join(outDir, 'build-info.json'),
        JSON.stringify({ daEnv, gitBranch, appVersion, builtAt: Date.now() })
      )
    },
  }
}

export default defineConfig({
  // @ts-ignore
  plugins: [
    vendorRuntimeAssets(),
    react({}),
    crx({ manifest, browser: browser.name }),
    buildInfo(),
  ],
  // Don't pre-bundle the variable font packages: when crxjs serves dev assets,
  // `?url` for pre-bundled CSS resolves to a `/vendor/...__url.js` shim instead
  // of the real CSS path, which breaks <link rel=stylesheet> font loading.
  optimizeDeps: {
    exclude: [
      '@fontsource-variable/noto-sans-jp',
      '@fontsource-variable/noto-sans-sc',
      '@fontsource-variable/noto-sans-tc',
      '@fontsource-variable/plus-jakarta-sans',
    ],
  },
  resolve: {
    // Select onnxruntime-web's extern-wasm webgpu build (ort.webgpu.min.mjs): it
    // loads wasm from the ort/ override instead of inlining it via `new URL`,
    // which would make Vite emit a duplicate copy into assets/ that is never loaded.
    conditions: ['onnxruntime-web-use-extern-wasm', ...defaultClientConditions],
    // Specific alias must precede the generic '@' prefix.
    alias: [
      ...(daEnv === 'prod'
        ? [{ find: '@/devApi', replacement: '/src/devApi/index.prod.ts' }]
        : []),
      { find: '@', replacement: '/src' },
    ],
  },
  server: {
    strictPort: true,
    port: port,
    hmr: {
      clientPort: port,
    },
    open: false,
    // Content scripts on host pages fetch font CSS/woff2 cross-origin from
    // localhost — Vite 7 defaults to no CORS, blocking those font requests.
    cors: { origin: '*' },
  },
  define: {
    'import.meta.env.VITE_TARGET_BROWSER': JSON.stringify(browser.name),
    'import.meta.env.VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_STANDALONE': JSON.stringify(false),
    'import.meta.env.VITE_DA_ENV': JSON.stringify(daEnv),
    'import.meta.env.VITE_DEV_SERVER_URL': JSON.stringify(
      `http://localhost:${port}`
    ),
    'import.meta.env.VITE_DA_BRANCH': JSON.stringify(
      daEnv === 'prod' ? '' : gitBranch
    ),
    ...e2eProxyDefines,
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: 'pages/popup.html',
        dashboard: 'pages/dashboard.html',
        // Hidden extension page that hosts MediaPipe for the occlusion feature.
        segmenter: 'pages/segmenter.html',
      },
      output: {
        manualChunks: (id) => {
          /**
           * Force reflect-metadata into a vendor chunk
           * This fix an issue where reflect-metadata is split into multiple chunks,
           * which breaks shimming and results in errors like Reflect.getOwnMetadata is not a function.
           * This also forces it to be the top import in the html files.
           */
          if (id.includes('node_modules/reflect-metadata')) {
            return 'vendor'
          }
        },
      },
    },
    outDir: `./dev/${browser.name}`,
    minify: !isFirefox, // don't minify for Firefox, so they can review the code
    // the minimum to support top-level await
    target: ['es2022', 'edge89', 'firefox89', 'chrome89', 'safari15'],
  },
  legacy: {
    skipWebSocketTokenCheck: true,
  },
  test: {
    setupFiles: ['src/tests/mockChromeApis.ts', 'src/tests/mockI18n.ts'],
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
