import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const SERVER_PORT = Number(process.env.DA_RELEASE_MANAGER_PORT ?? 4317)

export default defineConfig({
  root: 'src/web',
  plugins: [react()],
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': `http://127.0.0.1:${SERVER_PORT}`,
    },
  },
})
