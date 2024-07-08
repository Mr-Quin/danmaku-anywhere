import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { manifest } from './manifest'

const browser = process.env.TARGET_BROWSER ?? 'chrome'

// eslint-disable-next-line import/no-unused-modules
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
    port: 3000,
    hmr: {
      clientPort: 3000,
    },
    open: false,
  },
  build: {
    rollupOptions: {
      input: {
        app: 'pages/popup.html',
        options: 'pages/options.html',
      },
    },
  },
})
