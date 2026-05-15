import type {
  Bookmark,
  CustomEpisode,
  CustomEpisodeInsert,
  Episode,
  EpisodeInsert,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import type { BrowserContext, Worker } from '@playwright/test'
import type { ExtensionOptions } from '../../src/common/options/extensionOptions/schema'
import type { ProviderConfig } from '../../src/common/options/providerConfig/schema'
import type { MountMirror } from '../../src/devApi/namespaces/MountNamespace'
import type { StorageArea } from '../../src/devApi/namespaces/StorageNamespace'
import type { NamespaceDescription } from '../../src/devApi/registry'

export type { MountMirror }

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
      // sw.evaluate args go through structuredClone; surface non-clonable
      // inputs here instead of letting an opaque IPC error fire.
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

  season = {
    list: (): Promise<Season[]> =>
      this.sw.evaluate(() => self.__da.season.list()),
    get: (id: number): Promise<Season | undefined> =>
      this.sw.evaluate((id) => self.__da.season.get(id), id),
    add: (insert: SeasonInsert): Promise<Season> =>
      this.sw.evaluate((s) => self.__da.season.add(s), insert),
    delete: (id: number): Promise<void> =>
      this.sw.evaluate((id) => self.__da.season.delete(id), id),
  }

  episode = {
    add: (insert: EpisodeInsert): Promise<Episode> =>
      this.sw.evaluate((e) => self.__da.episode.add(e), insert),
    get: (id: number): Promise<Episode | undefined> =>
      this.sw.evaluate((id) => self.__da.episode.get(id), id),
    addCustom: (insert: CustomEpisodeInsert): Promise<CustomEpisode> =>
      this.sw.evaluate((e) => self.__da.episode.addCustom(e), insert),
    listCustom: (): Promise<CustomEpisode[]> =>
      this.sw.evaluate(() => self.__da.episode.listCustom()),
  }

  bookmark = {
    list: (): Promise<Bookmark[]> =>
      this.sw.evaluate(() => self.__da.bookmark.list()),
    bySeason: (seasonId: number): Promise<Bookmark | undefined> =>
      this.sw.evaluate((id) => self.__da.bookmark.bySeason(id), seasonId),
    deleteBySeason: (seasonId: number): Promise<void> =>
      this.sw.evaluate((id) => self.__da.bookmark.deleteBySeason(id), seasonId),
  }

  mount = {
    current: (tabId?: number): Promise<MountMirror | undefined> =>
      this.sw.evaluate((id) => self.__da.mount.current(id), tabId),
    waitForMount: (tabId?: number, timeoutMs?: number): Promise<MountMirror> =>
      this.sw.evaluate(([id, t]) => self.__da.mount.waitForMount(id, t), [
        tabId,
        timeoutMs,
      ] as const),
    waitForRegistration: (pattern: string, timeoutMs?: number): Promise<void> =>
      this.sw.evaluate(([p, t]) => self.__da.mount.waitForRegistration(p, t), [
        pattern,
        timeoutMs,
      ] as const),
  }
}

export async function getDaClient(context: BrowserContext): Promise<DaClient> {
  const [sw] = context.serviceWorkers()
  const worker = sw ?? (await context.waitForEvent('serviceworker'))
  return new DaClient(worker)
}
