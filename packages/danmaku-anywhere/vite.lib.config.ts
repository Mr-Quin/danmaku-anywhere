/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react({})],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  define: {
    'import.meta.env.VITE_TARGET_BROWSER': JSON.stringify('BROWSER'),
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'src/common/components/index.ts',
      formats: ['es'],
      name: 'danmaku-anywhere',
      fileName: 'index',
    },
    minify: false,
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
    outDir: './lib',
    target: ['es2022', 'edge89', 'firefox89', 'chrome89', 'safari15'],
  },
  test: {},
})
