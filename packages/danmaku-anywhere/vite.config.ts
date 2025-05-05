/// <reference types="vitest" />
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { manifest } from './manifest'

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
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: 'pages/popup.html',
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
