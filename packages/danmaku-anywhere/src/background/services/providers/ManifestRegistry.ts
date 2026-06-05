import { type Manifest, ManifestRunner, zManifest } from '@mr-quin/dango'
import builtinBilibili from '@mr-quin/dango-manifests/manifests/builtin-bilibili.json' with {
  type: 'json',
}
import builtinDandanplay from '@mr-quin/dango-manifests/manifests/builtin-dandanplay.json' with {
  type: 'json',
}
import builtinTencent from '@mr-quin/dango-manifests/manifests/builtin-tencent.json' with {
  type: 'json',
}
import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { invariant } from '@/common/utils/utils'
import { extensionFetchLike } from './extensionFetchLike'
import {
  type IManifestStore,
  type ManifestEntry,
  type ManifestKind,
  ManifestStore,
} from './ManifestStore'

const builtinManifests: unknown[] = [
  builtinDandanplay,
  builtinBilibili,
  builtinTencent,
]

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
    const seeded: Record<string, ManifestEntry> = {}
    for (const manifest of builtinManifests) {
      const parsed = zManifest.safeParse(manifest)
      if (!parsed.success) {
        this.log.error(
          'Failed to load built-in manifest:',
          (manifest as { id?: string }).id ?? '<unknown>',
          parsed.error.issues
        )
        continue
      }
      seeded[parsed.data.id] = { manifest, kind: 'preinstalled' }
      this.runners.set(parsed.data.id, this.buildRunner(parsed.data))
    }
    await this.store.setMany(seeded)
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
