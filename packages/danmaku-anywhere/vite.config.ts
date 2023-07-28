import { crx, defineManifest } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const manifest = defineManifest({
  manifest_version: 3,
  name: 'test-react-vite-4',
  version: '1.0.0',
  action: { default_popup: 'index.html' },
  content_scripts: [{ js: ['src/main.tsx'], matches: ['https://*/*'] }],
})
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    strictPort: true,
    port: 3000,
    hmr: {
      clientPort: 3000,
    },
  },
})
