import path from 'node:path'
import {
  cloudflareTest,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig(async () => {
  const migrationsPath = path.join(import.meta.dirname, 'drizzle')
  const migrations = await readD1Migrations(migrationsPath)

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.json' },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
          serviceBindings: {
            DDP_SERVICE: (request: Request) => {
              return new Response('Hi')
            },
          },
        },
      }),
    ],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    test: {
      setupFiles: ['./src/test/applyMigrations.ts'],
    },
  }
})
