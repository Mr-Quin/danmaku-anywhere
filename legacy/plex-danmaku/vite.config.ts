import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'
import monkey, { cdn } from 'vite-plugin-monkey'

// https://vitejs.dev/config/
// eslint-disable-next-line import/no-unused-modules
export default defineConfig({
  build: {
    minify: 'esbuild',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  plugins: [
    preact(),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Plex Danmaku',
        description: 'Danmaku support for Plex',
        namespace: 'https://github.com/Mr-Quin/plex-danmaku',
        match: [
          'http://*:32400/web/index.html*',
          'https://*:32400/web/index.html*',
          'https://app.plex.tv/*',
        ],
      },
      build: {
        externalGlobals: {
          preact: cdn.jsdelivr('preact', 'dist/preact.min.js'),
        },
      },
    }),
  ],
})
