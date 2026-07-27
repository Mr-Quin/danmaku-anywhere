import {
  getDisplayStrings,
  type Manifest,
  ManifestRunner,
  SUPPORTED_API_VERSIONS,
  zManifest,
} from '@mr-quin/dango'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type {
  ManifestUpdate,
  ProviderManifestInfo,
} from '@/common/rpcClient/background/types'
import { invariant, sleep } from '@/common/utils/utils'
import { bundledCatalogIndex, bundledManifestRaw } from './bundledCatalog'
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

// Shared by every catalog-gated path; tests and the popup toast match on it.
export const CATALOG_UNREACHABLE_MESSAGE =
  'Failed to fetch the manifest catalog'

// A catalog that answered but offers nothing this build can run is not a
// network failure, so it must not be reported as one.
export const CATALOG_EMPTY_MESSAGE =
  'The manifest catalog has no sources this version can use'

export type CatalogSyncResult = 'synced' | 'unreachable' | 'empty'

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

interface RegisteredManifest {
  runner: ManifestRunner
  kind: ManifestKind
}

@injectable('Singleton')
export class ManifestRegistry {
  private readonly runners = new Map<string, RegisteredManifest>()
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
    const entry = this.runners.get(manifestId)
    if (!entry) {
      throw new Error(`no manifest registered with id: ${manifestId}`)
    }
    return entry.runner
  }

  list(): string[] {
    invariant(this.initialized, 'ManifestRegistry accessed before ready')
    return [...this.runners.keys()]
  }

  listManifests(locale?: string): ProviderManifestInfo[] {
    invariant(this.initialized, 'ManifestRegistry accessed before ready')
    return [...this.runners.values()].map(({ runner, kind }) => {
      const { manifest } = runner
      const display = getDisplayStrings(manifest, locale)
      return {
        id: manifest.id,
        name: display.name,
        version: manifest.version,
        configSchema: display.configSchema,
        kind,
        identityFields: manifest.identityFields,
      }
    })
  }

  // The manifest's identityFields declaration, for namespace derivation. An
  // unregistered manifest (e.g. legacy:maccms, or one deleted since the config
  // was created) resolves as declaring none.
  async getIdentityFields(manifestId: string): Promise<readonly string[]> {
    await this.ready
    return this.runners.get(manifestId)?.runner.manifest.identityFields ?? []
  }

  async getIdentityFieldsMap(): Promise<Record<string, readonly string[]>> {
    await this.ready
    const map: Record<string, readonly string[]> = {}
    for (const [id, { runner }] of this.runners) {
      map[id] = runner.manifest.identityFields
    }
    return map
  }

  getLastCheckedAt(): Promise<number | null> {
    return this.store.getLastCheckedAt()
  }

  // Stamp the catalog as freshly synced; the caller decides when it is current.
  recordChecked(): Promise<void> {
    return this.store.setLastCheckedAt(Date.now())
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
    this.runners.set(parsed.data.id, {
      runner: this.buildRunner(parsed.data),
      kind,
    })
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

  // Add-only for everything except a bundle-seeded entry: a changed
  // preinstalled manifest surfaces via getPendingUpdates instead of being
  // replaced here, but a 'bundled' entry auto-upgrades to the catalog copy
  // the moment the index is reachable again, with no manual apply.
  //
  // Remote is primary because it's fresh; the bundled catalog is a same-shape
  // fallback used only when remote is unusable, so providers still exist
  // offline. The bundle can be stale, so the first successful sync replaces
  // any still-listed bundled entry outright rather than waiting for a manual
  // update, since the user never chose to install the bundled version.
  async update(): Promise<CatalogSyncResult> {
    await this.ready
    const entries = await this.loadIndex()
    if (!entries) {
      await this.seedFromBundle()
      return 'unreachable'
    }
    // An index that parses but lists nothing usable (empty, or every entry
    // dropped by the api-version filter) leaves the user with no sources just
    // as an unreachable one does, so it falls back to the bundle too.
    if (entries.length === 0) {
      await this.seedFromBundle()
      return 'empty'
    }
    const stored = await this.store.getAll()
    const missing = entries.filter((entry) => !stored[entry.id])
    const bundledStale = entries.filter(
      (entry) => stored[entry.id]?.kind === 'bundled'
    )
    await this.fetchAndStore([...missing, ...bundledStale])
    return 'synced'
  }

  // Index-only: diff stored versions against the catalog without fetching files
  // or applying. Throws on an unreachable catalog: "no updates" and "could not
  // check" must stay distinguishable, or a failed check would clear the
  // popup's pending list.
  async getPendingUpdates(): Promise<ManifestUpdate[]> {
    await this.ready
    const entries = await this.loadIndex()
    if (!entries) {
      throw new Error(CATALOG_UNREACHABLE_MESSAGE)
    }
    const stored = await this.store.getAll()
    const updates: ManifestUpdate[] = []
    for (const entry of entries) {
      const existing = stored[entry.id]
      // 'user' is never replaced by the catalog. 'bundled' auto-upgrades in
      // update() as soon as the index is reachable, so it must not also
      // surface here as a manual "update available".
      if (
        !existing ||
        existing.kind === 'user' ||
        existing.kind === 'bundled'
      ) {
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

  // Replace only the named manifests that are already stored as preinstalled
  // or bundled. User imports and ids not already seeded are left untouched,
  // so an apply can never clobber a user manifest or install a brand-new
  // source. Throws on failure (unreachable catalog or a file that did not
  // apply) so a user-driven update surfaces the error instead of silently
  // no-op'ing.
  async applyUpdates(manifestIds: string[]): Promise<void> {
    await this.ready
    const entries = await this.loadIndex()
    if (!entries) {
      throw new Error(CATALOG_UNREACHABLE_MESSAGE)
    }
    const wanted = new Set(manifestIds)
    const stored = await this.store.getAll()
    const targets = entries.filter((entry) => {
      const existing = stored[entry.id]
      return (
        wanted.has(entry.id) &&
        (existing?.kind === 'preinstalled' || existing?.kind === 'bundled')
      )
    })
    const applied = await this.fetchAndStore(targets)
    if (applied.length < targets.length) {
      const failed = targets
        .map((entry) => entry.id)
        .filter((id) => !applied.includes(id))
      throw new Error(`Failed to apply updates: ${failed.join(', ')}`)
    }
  }

  // Persists a user-authored manifest. The id is the manifest's own id, so the
  // guard reads the store by that id rather than trusting a caller-supplied one.
  // create rejects any existing id (a user manifest must not shadow a built-in
  // or another user manifest); update only touches an id already owned by the
  // user, so a preinstalled manifest can never be edited in place.
  async saveUserManifest(
    manifest: unknown,
    mode: 'create' | 'update',
    expectedId?: string
  ): Promise<void> {
    await this.ready
    const parsed = zManifest.safeParse(manifest)
    if (!parsed.success) {
      throw new Error(
        `invalid manifest: ${JSON.stringify(parsed.error.issues)}`
      )
    }
    const id = parsed.data.id
    // The id is the manifest's identity; an update must target the id being
    // edited, or it would orphan the old entry and could overwrite an
    // unrelated manifest. An omitted expectedId would bypass the check, so it
    // is required.
    if (mode === 'update' && (expectedId === undefined || id !== expectedId)) {
      throw new Error('A manifest id cannot be changed')
    }
    const existing = await this.store.get(id)
    if (mode === 'create' && existing) {
      throw new Error(`A manifest with id "${id}" already exists`)
    }
    if (mode === 'update' && existing?.kind !== 'user') {
      throw new Error(`No user manifest with id "${id}" to update`)
    }
    // Build before persisting: a manifest that passes zManifest can still throw
    // at runner construction, and a stored-but-unbuildable manifest would break
    // init() on the next startup.
    const runner = this.buildRunner(parsed.data)
    await this.store.set(id, { manifest, kind: 'user' })
    this.runners.set(id, { runner, kind: 'user' })
  }

  // Returns the raw stored manifest JSON (not the parsed runner form) so the
  // editor can show or duplicate exactly what was imported.
  getSource(manifestId: string): Promise<ManifestEntry | undefined> {
    return this.store.get(manifestId)
  }

  private async init(): Promise<void> {
    const record = await this.store.getAll()
    for (const [id, entry] of Object.entries(record)) {
      this.loadEntry(id, entry)
    }
    this.initialized = true
  }

  // Returns the ids actually stored; the caller can compare against what it
  // asked for to tell a partial failure from a complete one.
  private async fetchAndStore(entries: CatalogEntry[]): Promise<string[]> {
    const fetched = (
      await Promise.all(
        entries.map((entry) => this.fetchManifest(entry.file, entry.id))
      )
    ).filter((manifest) => manifest !== null)
    if (fetched.length === 0) {
      return []
    }
    const updates: Record<string, ManifestEntry> = {}
    for (const { raw, parsed } of fetched) {
      updates[parsed.id] = { manifest: raw, kind: 'preinstalled' }
    }
    await this.store.setMany(updates)
    for (const { parsed } of fetched) {
      this.runners.set(parsed.id, {
        runner: this.buildRunner(parsed),
        kind: 'preinstalled',
      })
    }
    return fetched.map(({ parsed }) => parsed.id)
  }

  // Add-only, same contract as fetchAndStore: only ids absent from the store
  // are seeded. Each bundled manifest is re-validated with zManifest so a
  // corrupt bundle entry is skipped rather than crashing startup. Tagged
  // 'bundled' rather than 'preinstalled' so update() knows to replace it
  // outright on the next reachable sync instead of treating it as a normal
  // installed source pinned until a manual apply.
  private async seedFromBundle(): Promise<void> {
    const stored = await this.store.getAll()
    const missing = bundledCatalogIndex().filter((entry) => !stored[entry.id])
    if (missing.length === 0) {
      return
    }
    const updates: Record<string, ManifestEntry> = {}
    const toRegister: Manifest[] = []
    for (const entry of missing) {
      const raw = bundledManifestRaw(entry.id)
      const parsed = zManifest.safeParse(raw)
      if (!parsed.success) {
        this.log.error(
          'Skipping invalid bundled manifest:',
          entry.id,
          parsed.error.issues
        )
        continue
      }
      updates[parsed.data.id] = { manifest: raw, kind: 'bundled' }
      toRegister.push(parsed.data)
    }
    if (toRegister.length === 0) {
      return
    }
    await this.store.setMany(updates)
    for (const manifest of toRegister) {
      this.runners.set(manifest.id, {
        runner: this.buildRunner(manifest),
        kind: 'bundled',
      })
    }
  }

  private async loadIndex(): Promise<CatalogEntry[] | null> {
    try {
      return await this.fetchIndex()
    } catch (e) {
      this.log.warn('Catalog index fetch failed, retrying:', e)
    }
    await sleep(1000)
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
    // The store keys by the manifest's own id; a mismatch with the catalog id
    // would store it under the wrong key and loop as a never-resolving update.
    if (parsed.data.id !== id) {
      this.log.error(
        'Skipping catalog manifest with mismatched id:',
        id,
        parsed.data.id
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
    // Per-manifest, and runner construction can throw past safeParse, so one
    // bad stored spec can't take the whole registry down on startup.
    const parsed = zManifest.safeParse(entry.manifest)
    if (!parsed.success) {
      this.log.error('Failed to load manifest:', id, parsed.error.issues)
      return
    }
    try {
      this.runners.set(id, {
        runner: this.buildRunner(parsed.data),
        kind: entry.kind,
      })
    } catch (e) {
      this.log.error('Failed to build runner for manifest:', id, e)
    }
  }

  private buildRunner(manifest: Manifest): ManifestRunner {
    return new ManifestRunner(manifest, { fetcher: extensionFetchLike })
  }
}
