/// <reference types="vitest" />
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { getBuildContext } from './scripts/getBuildContext'
import { dropOcclusionRuntimes } from './scripts/vendorRuntimeAssets'

const { browser, appVersion } = getBuildContext()

const port = 3052

export default defineConfig({
  // The ort wasm is over the 25 MiB limit for one Cloudflare Workers asset.
  plugins: [react({}), dropOcclusionRuntimes()],
  publicDir: path.resolve('public'),
  resolve: {
    alias: {
      '@': path.resolve('src'),
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
    'import.meta.env.VITE_TARGET_BROWSER': JSON.stringify(browser.name),
    'import.meta.env.VERSION': JSON.stringify(`${appVersion}-standalone`),
    'import.meta.env.VITE_STANDALONE': JSON.stringify('true'),
  },
  build: {
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        index: 'index.html',
      },
    },
    outDir: './build-standalone',
    // the minimum to support top-level await
    target: ['es2022', 'edge89', 'firefox89', 'chrome89', 'safari15'],
  },
  legacy: {
    skipWebSocketTokenCheck: true,
  },
  test: {
    setupFiles: ['src/tests/mockChromeApis.ts', 'src/tests/mockI18n.ts'],
  },
})
