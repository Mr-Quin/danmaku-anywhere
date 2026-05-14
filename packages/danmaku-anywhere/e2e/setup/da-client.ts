// Typed wrapper around the SW-side __da dev API. Each method evaluates a
// thunk in the service worker context and returns the result.
//
// Drift policy: when a new namespace lands in src/devApi/, add a wrapper
// here. The mismatch is intentional and surfaces at test-author time
// (autocomplete missing). A future codegen step (see .specs/DA-491-e2e-infra.md
// §4.3) will derive this from the registry's describe() output.

import type { BrowserContext, Worker } from '@playwright/test'
import type { ExtensionOptions } from '../../src/common/options/extensionOptions/schema'
import type { ProviderConfig } from '../../src/common/options/providerConfig/schema'
import type { NamespaceDescription } from '../../src/devApi/registry'

type StorageArea = 'sync' | 'local' | 'session'

export class DaClient {
  constructor(private readonly sw: Worker) {}

  describe = (): Promise<NamespaceDescription[]> =>
    // biome-ignore lint/suspicious/noExplicitAny: __da is ambient SW global
    this.sw.evaluate(() => (globalThis as any).__da.describe())

  providerConfig = {
    list: (): Promise<ProviderConfig[]> =>
      this.sw.evaluate(() =>
        // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
        (globalThis as any).__da.providerConfig.list()
      ),
    get: (id: string): Promise<ProviderConfig | undefined> =>
      this.sw.evaluate(
        // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
        (id: string) => (globalThis as any).__da.providerConfig.get(id),
        id
      ),
    set: (configs: ProviderConfig[]): Promise<void> =>
      this.sw.evaluate(
        // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
        (c: ProviderConfig[]) => (globalThis as any).__da.providerConfig.set(c),
        configs
      ),
    toggle: (id: string, enabled?: boolean): Promise<ProviderConfig> =>
      this.sw.evaluate(
        ([i, e]: [string, boolean | undefined]) =>
          // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
          (globalThis as any).__da.providerConfig.toggle(i, e),
        [id, enabled] as const
      ),
    reset: (): Promise<void> =>
      this.sw.evaluate(() =>
        // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
        (globalThis as any).__da.providerConfig.reset()
      ),
  }

  storage = {
    get: (area: StorageArea, key: string): Promise<unknown> =>
      this.sw.evaluate(
        ([a, k]: [StorageArea, string]) =>
          // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
          (globalThis as any).__da.storage.get(a, k),
        [area, key] as const
      ),
    snapshot: (area: StorageArea): Promise<Record<string, unknown>> =>
      this.sw.evaluate(
        // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
        (a: StorageArea) => (globalThis as any).__da.storage.snapshot(a),
        area
      ),
    setRaw: (area: StorageArea, key: string, value: unknown): Promise<void> => {
      // Validate JSON-clonable at the boundary; structuredClone errors from
      // Worker.evaluate are opaque otherwise.
      try {
        JSON.stringify(value)
      } catch (e) {
        throw new Error(
          `DaClient.storage.setRaw value is not JSON-clonable: ${(e as Error).message}`
        )
      }
      return this.sw.evaluate(
        ([a, k, v]: [StorageArea, string, unknown]) =>
          // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
          (globalThis as any).__da.storage.setRaw(a, k, v),
        [area, key, value] as const
      )
    },
    clear: (): Promise<void> =>
      // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
      this.sw.evaluate(() => (globalThis as any).__da.storage.clear()),
  }

  extensionOptions = {
    get: (): Promise<ExtensionOptions> =>
      this.sw.evaluate(() =>
        // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
        (globalThis as any).__da.extensionOptions.get()
      ),
    update: (partial: Partial<ExtensionOptions>): Promise<void> =>
      this.sw.evaluate(
        (p: Partial<ExtensionOptions>) =>
          // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
          (globalThis as any).__da.extensionOptions.update(p),
        partial
      ),
  }

  runtime = {
    version: (): Promise<string> =>
      this.sw.evaluate(() =>
        // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
        (globalThis as any).__da.runtime.version()
      ),
    reload: (): Promise<void> =>
      this.sw.evaluate(() =>
        // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
        (globalThis as any).__da.runtime.reload()
      ),
    runUpgrade: (): Promise<void> =>
      this.sw.evaluate(() =>
        // biome-ignore lint/suspicious/noExplicitAny: __da is ambient
        (globalThis as any).__da.runtime.runUpgrade()
      ),
  }
}

// Get (or wait for) the SW and wrap it in a DaClient.
export async function getDaClient(context: BrowserContext): Promise<DaClient> {
  const [sw] = context.serviceWorkers()
  const worker = sw ?? (await context.waitForEvent('serviceworker'))
  return new DaClient(worker)
}
