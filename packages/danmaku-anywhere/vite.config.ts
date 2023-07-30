import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { manifest } from './manifest'

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
  },
})
