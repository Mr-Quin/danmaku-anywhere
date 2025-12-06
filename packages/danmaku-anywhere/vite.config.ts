/// <reference types="vitest" />
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { manifest } from './manifest'
import { getBuildContext } from './scripts/getBuildContext'

const { browser, appVersion, isDev } = getBuildContext()

const { isChrome, isFirefox } = browser

if (!['chrome', 'firefox'].includes(browser.name)) {
  throw new Error(
    `Browser target must be either 'chrome' or 'firefox', but got ${browser.name}`
  )
}

const port = isChrome ? 3000 : 3001

console.log('Building for', {
  browser,
  appVersion,
  isDev,
})

export default defineConfig({
  // @ts-ignore
  plugins: [react({}), crx({ manifest, browser })],
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
    'import.meta.env.VITE_TARGET_BROWSER': JSON.stringify(browser),
    'import.meta.env.VERSION': JSON.stringify(appVersion),
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
    outDir: `./dev/${browser}`,
    minify: !isFirefox, // don't minify for Firefox, so they can review the code
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
