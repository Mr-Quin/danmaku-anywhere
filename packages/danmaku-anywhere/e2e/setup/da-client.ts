import type { BrowserContext, Worker } from '@playwright/test'
import type { ExtensionOptions } from '../../src/common/options/extensionOptions/schema'
import type { ProviderConfig } from '../../src/common/options/providerConfig/schema'
import type { StorageArea } from '../../src/devApi/namespaces/StorageNamespace'
import type { NamespaceDescription } from '../../src/devApi/registry'

// `self.__da` is the ambient SW-side dev API global declared in
// src/devApi/index.ts. Each method below evaluates a thunk in the SW context
// where `self.__da` is in scope; the wrapper just types and routes the call.

export class DaClient {
  constructor(private readonly sw: Worker) {}

  describe(): Promise<NamespaceDescription[]> {
    return this.sw.evaluate(() => self.__da.describe())
  }

  providerConfig = {
    list: (): Promise<ProviderConfig[]> =>
      this.sw.evaluate(() => self.__da.providerConfig.list()),
    get: (id: string): Promise<ProviderConfig | undefined> =>
      this.sw.evaluate((id) => self.__da.providerConfig.get(id), id),
    set: (configs: ProviderConfig[]): Promise<void> =>
      this.sw.evaluate((c) => self.__da.providerConfig.set(c), configs),
    toggle: (id: string, enabled?: boolean): Promise<ProviderConfig> =>
      this.sw.evaluate(([i, e]) => self.__da.providerConfig.toggle(i, e), [
        id,
        enabled,
      ] as const),
    reset: (): Promise<void> =>
      this.sw.evaluate(() => self.__da.providerConfig.reset()),
  }

  storage = {
    get: (area: StorageArea, key: string): Promise<unknown> =>
      this.sw.evaluate(([a, k]) => self.__da.storage.get(a, k), [
        area,
        key,
      ] as const),
    snapshot: (area: StorageArea): Promise<Record<string, unknown>> =>
      this.sw.evaluate((a) => self.__da.storage.snapshot(a), area),
    setRaw: (area: StorageArea, key: string, value: unknown): Promise<void> => {
      // structuredClone errors out of sw.evaluate are opaque; surface bad
      // inputs at the boundary instead.
      try {
        JSON.stringify(value)
      } catch (e) {
        throw new Error(
          `setRaw value is not JSON-clonable: ${(e as Error).message}`
        )
      }
      return this.sw.evaluate(
        ([a, k, v]) => self.__da.storage.setRaw(a, k, v),
        [area, key, value] as const
      )
    },
    clear: (): Promise<void> =>
      this.sw.evaluate(() => self.__da.storage.clear()),
  }

  extensionOptions = {
    get: (): Promise<ExtensionOptions> =>
      this.sw.evaluate(() => self.__da.extensionOptions.get()),
    update: (partial: Partial<ExtensionOptions>): Promise<void> =>
      this.sw.evaluate((p) => self.__da.extensionOptions.update(p), partial),
  }

  runtime = {
    version: (): Promise<string> =>
      this.sw.evaluate(() => self.__da.runtime.version()),
    reload: (): Promise<void> =>
      this.sw.evaluate(() => self.__da.runtime.reload()),
    runUpgrade: (): Promise<void> =>
      this.sw.evaluate(() => self.__da.runtime.runUpgrade()),
  }
}

export async function getDaClient(context: BrowserContext): Promise<DaClient> {
  const [sw] = context.serviceWorkers()
  const worker = sw ?? (await context.waitForEvent('serviceworker'))
  return new DaClient(worker)
}
