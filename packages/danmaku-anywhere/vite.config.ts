/// <reference types="vitest" />
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { manifest } from './manifest'
import pkg from './package.json' with { type: 'json' }

const BROWSER = process.env.VITE_TARGET_BROWSER ?? 'chrome'

if (!['chrome', 'firefox'].includes(BROWSER)) {
  throw new Error(
    `Browser target must be either 'chrome' or 'firefox', but got ${BROWSER}`
  )
}

const IS_CHROME = BROWSER === 'chrome'
const IS_FIREFOX = BROWSER === 'firefox'

const dev = process.env.NODE_ENV === 'development'

const port = IS_CHROME ? 3000 : 3001

console.log('Building for', {
  browser: BROWSER,
  dev,
})

export default defineConfig({
  // @ts-ignore
  plugins: [react({}), crx({ manifest, browser: BROWSER })],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    strictPort: true,
    port: port,
    hmr: {
      clientPort: port,
    },
    open: false,
  },
  define: {
    'import.meta.env.VITE_TARGET_BROWSER': JSON.stringify(BROWSER),
    'import.meta.env.VERSION': JSON.stringify(pkg.version),
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: 'pages/popup.html',
        dashboard: 'pages/dashboard.html',
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
    outDir: `./dev/${BROWSER}`,
    minify: !IS_FIREFOX, // don't minify for Firefox, so they can review the code
    // the minimum to support top-level await
    target: ['es2022', 'edge89', 'firefox89', 'chrome89', 'safari15'],
  },
  legacy: {
    skipWebSocketTokenCheck: true,
  },
  test: {
    setupFiles: ['src/tests/mockChromeApis.ts'],
  },
})
