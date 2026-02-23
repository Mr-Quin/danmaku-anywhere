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
        singleWorkerMode: true,
        wrangler: { configPath: './wrangler.json' },
        miniflare: {
          serviceBindings: {
            DDP_SERVICE: (request: Request) => {
              return new Response('Hi')
            },
          },
        },
      },
    },
  },
})
