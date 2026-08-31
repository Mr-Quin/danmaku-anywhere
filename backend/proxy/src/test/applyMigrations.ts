import type { D1Migration } from 'cloudflare:test'
import { applyD1Migrations, env } from 'cloudflare:test'

// TEST_MIGRATIONS is bound by the vitest pool, not by any deployed environment, so it is
// typed here rather than on Cloudflare.Env (which the worker's own Env extends).
const { TEST_MIGRATIONS } = env as typeof env & {
  TEST_MIGRATIONS: D1Migration[]
}

// Setup files run outside isolated storage, and may be run multiple times.
// `applyD1Migrations()` only applies migrations that haven't already been
// applied, therefore it is safe to call this function here.
await applyD1Migrations(env.DB, TEST_MIGRATIONS)
