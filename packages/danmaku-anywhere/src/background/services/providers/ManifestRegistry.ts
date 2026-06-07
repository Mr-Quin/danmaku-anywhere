import {
  type Manifest,
  ManifestRunner,
  SUPPORTED_API_VERSIONS,
  zManifest,
} from '@mr-quin/dango'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { alarmKeys } from '@/common/alarms/constants'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type {
  ManifestUpdate,
  ProviderManifestInfo,
} from '@/common/rpcClient/background/types'
import { invariant } from '@/common/utils/utils'
import { extensionFetchLike } from './extensionFetchLike'
import {
  type IManifestStore,
  type ManifestEntry,
  type ManifestKind,
  ManifestStore,
} from './ManifestStore'

const zCatalogEntry = z.object({
  id: z.string(),
  apiVersion: z.number(),
  version: z.string(),
  file: z.string(),
})

const zCatalogIndex = z.object({
  manifests: z.array(zCatalogEntry),
})

type CatalogEntry = z.infer<typeof zCatalogEntry>
type CatalogManifest = { raw: unknown; parsed: Manifest }

function storedVersion(manifest: unknown): unknown {
  if (
    manifest !== null &&
    typeof manifest === 'object' &&
    'version' in manifest
  ) {
    return (manifest as { version: unknown }).version
  }
  return undefined
}

@injectable('Singleton')
export class ManifestRegistry {
  private readonly runners = new Map<string, ManifestRunner>()
  private readonly log: ILogger
  private readonly store: IManifestStore
  private readonly baseUrl = import.meta.env.VITE_PROXY_URL
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

  listManifests(): ProviderManifestInfo[] {
    invariant(this.initialized, 'ManifestRegistry accessed before ready')
    return [...this.runners.values()].map(({ manifest }) => ({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      configSchema: manifest.configSchema,
    }))
  }

  getLastCheckedAt(): Promise<number | null> {
    return this.store.getLastCheckedAt()
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

  setup(): void {
    chrome.runtime.onInstalled.addListener(() => {
      this.update().catch((e) => {
        this.log.error('Manifest update failed:', e)
      })
    })

    void this.createRefreshAlarm()

    if (!chrome.alarms.onAlarm.hasListener(this.handleRefreshAlarm)) {
      chrome.alarms.onAlarm.addListener(this.handleRefreshAlarm)
    }
  }

  // Add-only reconcile: seed the manifests the store is missing (an empty store
  // seeds all). Changed preinstalled manifests surface via getPendingUpdates
  // instead of being replaced here.
  async update(): Promise<void> {
    await this.ready
    const entries = await this.loadIndex()
    if (!entries) {
      return
    }
    await this.store.setLastCheckedAt(Date.now())
    const stored = await this.store.getAll()
    const missing = entries.filter((entry) => !stored[entry.id])
    await this.fetchAndStore(missing)
  }

  // Index-only: diff stored versions against the catalog without fetching files
  // or applying. Records the check time for the UI's "checked Nm ago".
  async getPendingUpdates(): Promise<ManifestUpdate[]> {
    await this.ready
    const entries = await this.loadIndex()
    if (!entries) {
      return []
    }
    await this.store.setLastCheckedAt(Date.now())
    const stored = await this.store.getAll()
    const updates: ManifestUpdate[] = []
    for (const entry of entries) {
      const existing = stored[entry.id]
      if (!existing || existing.kind === 'user') {
        continue
      }
      const fromVersion = storedVersion(existing.manifest)
      if (typeof fromVersion === 'string' && fromVersion !== entry.version) {
        updates.push({
          manifestId: entry.id,
          fromVersion,
          toVersion: entry.version,
        })
      }
    }
    return updates
  }

  // Replace only the named manifests that are already stored as preinstalled.
  // User imports and ids not already seeded are left untouched, so an apply
  // can never clobber a user manifest or install a brand-new source.
  async applyUpdates(manifestIds: string[]): Promise<void> {
    await this.ready
    const entries = await this.loadIndex()
    if (!entries) {
      return
    }
    const wanted = new Set(manifestIds)
    const stored = await this.store.getAll()
    const targets = entries.filter((entry) => {
      const existing = stored[entry.id]
      return wanted.has(entry.id) && existing?.kind === 'preinstalled'
    })
    await this.fetchAndStore(targets)
  }

  private async init(): Promise<void> {
    const record = await this.store.getAll()
    for (const [id, entry] of Object.entries(record)) {
      this.loadEntry(id, entry)
    }
    this.initialized = true
  }

  private async createRefreshAlarm(): Promise<void> {
    const existing = await chrome.alarms.get(alarmKeys.REFRESH_MANIFESTS)
    if (existing) {
      return
    }
    this.log.debug('Creating manifest refresh alarm')
    await chrome.alarms.create(alarmKeys.REFRESH_MANIFESTS, {
      periodInMinutes: 60 * 12,
      delayInMinutes: 60,
    })
  }

  // Periodic catalog refresh: recover a store emptied by a failed seed and
  // record a check. Detection stays on-demand (getPendingUpdates); the alarm
  // never auto-applies.
  private handleRefreshAlarm = async (
    alarm: chrome.alarms.Alarm
  ): Promise<void> => {
    if (alarm.name !== alarmKeys.REFRESH_MANIFESTS) {
      return
    }
    await this.update()
  }

  private async fetchAndStore(entries: CatalogEntry[]): Promise<void> {
    const fetched = (
      await Promise.all(
        entries.map((entry) => this.fetchManifest(entry.file, entry.id))
      )
    ).filter((manifest) => manifest !== null)
    if (fetched.length === 0) {
      return
    }
    const updates: Record<string, ManifestEntry> = {}
    for (const { raw, parsed } of fetched) {
      updates[parsed.id] = { manifest: raw, kind: 'preinstalled' }
    }
    await this.store.setMany(updates)
    for (const { parsed } of fetched) {
      this.runners.set(parsed.id, this.buildRunner(parsed))
    }
  }

  private async loadIndex(): Promise<CatalogEntry[] | null> {
    try {
      return await this.fetchIndex()
    } catch (e) {
      this.log.error('Failed to fetch manifest catalog:', e)
      return null
    }
  }

  private async fetchIndex(): Promise<CatalogEntry[]> {
    const index = zCatalogIndex.parse(
      await this.fetchJson(`${this.baseUrl}/manifest`)
    )
    return index.manifests.filter((entry) =>
      SUPPORTED_API_VERSIONS.has(entry.apiVersion)
    )
  }

  // Skip (null) on any per-manifest failure so one bad file doesn't block the
  // rest; the next reconcile retries whatever is still missing.
  private async fetchManifest(
    file: string,
    id: string
  ): Promise<CatalogManifest | null> {
    let raw: unknown
    try {
      raw = await this.fetchJson(
        `${this.baseUrl}/manifest/file?file=${encodeURIComponent(file)}`
      )
    } catch (e) {
      this.log.error('Failed to fetch catalog manifest:', id, e)
      return null
    }
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
