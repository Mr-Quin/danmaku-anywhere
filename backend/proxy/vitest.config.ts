import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.json' },
      },
    },
  },
})
