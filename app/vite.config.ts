/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const dev = process.env.NODE_ENV === 'development'

const port = 3123

console.log('Building for', {
  browser: 'BROWSER',
  dev,
})

export default defineConfig({
  plugins: [react({}), tailwindcss()],
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
  define: {},
  build: {
    emptyOutDir: true,
    rollupOptions: {},
    target: ['es2022', 'edge89', 'firefox89', 'chrome89', 'safari15'],
  },
  legacy: {},
  test: {},
})
