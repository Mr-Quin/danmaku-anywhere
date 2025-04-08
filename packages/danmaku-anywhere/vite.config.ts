/// <reference types="vitest" />
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { manifest } from './manifest'

const browser = process.env.VITE_TARGET_BROWSER ?? 'chrome'

if (!['chrome', 'firefox'].includes(browser)) {
  throw new Error(
    `Browser target must be either 'chrome' or 'firefox', but got ${browser}`
  )
}

const isChrome = browser === 'chrome'
const isFirefox = browser === 'firefox'

const dev = process.env.NODE_ENV === 'development'

const port = isChrome ? 3000 : 3001

console.log('Building for', {
  browser,
  dev,
})

export default defineConfig({
  // @ts-ignore
  plugins: [react({}), crx({ manifest, browser: browser })],
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
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: 'pages/popup.html',
      },
    },
    outDir: `./dev/${browser}`,
    minify: isFirefox, // don't minify for Firefox, so they can review the code
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
