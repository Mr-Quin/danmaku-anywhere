import {
  type Manifest,
  ManifestRunner,
  SUPPORTED_API_VERSIONS,
  zManifest,
} from '@mr-quin/dango'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { invariant } from '@/common/utils/utils'
import { extensionFetchLike } from './extensionFetchLike'
import {
  type IManifestStore,
  type ManifestEntry,
  type ManifestKind,
  ManifestStore,
} from './ManifestStore'

const zCatalogIndex = z.object({
  manifests: z.array(
    z.object({
      id: z.string(),
      apiVersion: z.number(),
      file: z.string(),
    })
  ),
})

type CatalogManifest = { raw: unknown; parsed: Manifest }

@injectable('Singleton')
export class ManifestRegistry {
  private readonly runners = new Map<string, ManifestRunner>()
  private readonly log: ILogger
  private readonly store: IManifestStore
  private initialized = false
  readonly ready: Promise<void>

  constructor(
    @inject(LoggerSymbol) logger: ILogger,
    @inject(ManifestStore) store: IManifestStore
  ) {
    this.log = logger.sub('[ManifestRegistry]')
    this.store = store
    this.ready = this.init()
  }

  // Synchronous: callers gate on `ready` once at the boundary (see
  // ProviderService), so by the time a runner is resolved the store has
  // already hydrated into the in-memory map.
  getRunner(manifestId: string): ManifestRunner {
    invariant(this.initialized, 'ManifestRegistry accessed before ready')
    const runner = this.runners.get(manifestId)
    if (!runner) {
      throw new Error(`no manifest registered with id: ${manifestId}`)
    }
    return runner
  }

  list(): string[] {
    invariant(this.initialized, 'ManifestRegistry accessed before ready')
    return [...this.runners.keys()]
  }

  async register(manifest: unknown, kind: ManifestKind): Promise<void> {
    await this.ready
    const parsed = zManifest.safeParse(manifest)
    if (!parsed.success) {
      throw new Error(
        `invalid manifest: ${JSON.stringify(parsed.error.issues)}`
      )
    }
    await this.store.set(parsed.data.id, { manifest, kind })
    this.runners.set(parsed.data.id, this.buildRunner(parsed.data))
  }

  async unregister(manifestId: string): Promise<void> {
    await this.ready
    await this.store.remove(manifestId)
    this.runners.delete(manifestId)
  }

  async refresh(): Promise<void> {
    await this.ready
    const record = await this.store.getAll()
    this.runners.clear()
    for (const [id, entry] of Object.entries(record)) {
      this.loadEntry(id, entry)
    }
  }

  private async init(): Promise<void> {
    const record = await this.store.getAll()
    if (Object.keys(record).length === 0) {
      await this.seed()
    } else {
      for (const [id, entry] of Object.entries(record)) {
        this.loadEntry(id, entry)
      }
    }
    this.initialized = true
  }

  private async seed(): Promise<void> {
    let catalog: CatalogManifest[]
    try {
      catalog = await this.fetchCatalog()
    } catch (e) {
      // Leave the store empty so the next init / service-worker wake retries.
      this.log.error('Failed to seed manifests from catalog:', e)
      return
    }
    const seeded: Record<string, ManifestEntry> = {}
    for (const { raw, parsed } of catalog) {
      seeded[parsed.id] = { manifest: raw, kind: 'preinstalled' }
      this.runners.set(parsed.id, this.buildRunner(parsed))
    }
    await this.store.setMany(seeded)
  }

  private async fetchCatalog(): Promise<CatalogManifest[]> {
    const baseUrl = import.meta.env.VITE_PROXY_URL
    const index = zCatalogIndex.parse(
      await this.fetchJson(`${baseUrl}/manifest`)
    )
    const supported = index.manifests.filter((entry) =>
      SUPPORTED_API_VERSIONS.has(entry.apiVersion)
    )
    const fetched = await Promise.all(
      supported.map((entry) =>
        this.fetchManifest(baseUrl, entry.file, entry.id)
      )
    )
    return fetched.filter((entry) => entry !== null)
  }

  private async fetchManifest(
    baseUrl: string,
    file: string,
    id: string
  ): Promise<CatalogManifest | null> {
    const raw = await this.fetchJson(
      `${baseUrl}/manifest/file?file=${encodeURIComponent(file)}`
    )
    const parsed = zManifest.safeParse(raw)
    if (!parsed.success) {
      this.log.error(
        'Skipping invalid catalog manifest:',
        id,
        parsed.error.issues
      )
      return null
    }
    return { raw, parsed: parsed.data }
  }

  private async fetchJson(url: string): Promise<unknown> {
    const res = await extensionFetchLike(url, {
      signal: AbortSignal.timeout(5000),
    })
    if (res.status !== 200) {
      throw new Error(`catalog fetch failed (${res.status}): ${url}`)
    }
    return JSON.parse(await res.text())
  }

  private loadEntry(id: string, entry: ManifestEntry): void {
    // Per-manifest so one bad spec doesn't take the registry down.
    const parsed = zManifest.safeParse(entry.manifest)
    if (!parsed.success) {
      this.log.error('Failed to load manifest:', id, parsed.error.issues)
      return
    }
    this.runners.set(id, this.buildRunner(parsed.data))
  }

  private buildRunner(manifest: Manifest): ManifestRunner {
    return new ManifestRunner(manifest, { fetcher: extensionFetchLike })
  }
}
