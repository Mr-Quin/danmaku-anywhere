import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { manifest } from './manifest'

// eslint-disable-next-line import/no-unused-modules
export default defineConfig({
  plugins: [react({}), crx({ manifest })],
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
    open: 'pages/popup.html',
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
