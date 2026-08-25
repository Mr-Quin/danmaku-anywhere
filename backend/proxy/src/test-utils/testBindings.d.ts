import type { D1Migration } from 'cloudflare:test'

declare global {
  // biome-ignore lint/style/noNamespace: cloudflare:test types env as Cloudflare.Env, so the vitest pool's binding has to be declared there
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}
