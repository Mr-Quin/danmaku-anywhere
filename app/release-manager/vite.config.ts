import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 1420,
    strictPort: true,
    // Cargo rebuilds into src-tauri/target while Vite is running. Watching
    // it crashes Vite on Windows with EBUSY on the freshly linked DLL.
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})
