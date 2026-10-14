/// <reference types="vitest" />
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { getBuildContext } from './scripts/getBuildContext'

const { browser, appVersion } = getBuildContext()

const port = 3052

export default defineConfig({
  plugins: [react({})],
  publicDir: path.resolve('public'),
  resolve: {
    alias: [
      {
        find: '@/common/standalone/loadStandaloneBackend',
        replacement: path.resolve(
          'src/common/standalone/loadStandaloneBackend.standalone.ts'
        ),
      },
      { find: '@', replacement: path.resolve('src') },
    ],
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
      output: {
        // The lazily loaded standalone backend shares modules with the page,
        // which pulled reflect-metadata into a shared chunk. Pinned to its own
        // chunk it loads first, as in the extension build.
        manualChunks: (id) => {
          if (id.includes('node_modules/reflect-metadata')) {
            return 'vendor'
          }
        },
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
