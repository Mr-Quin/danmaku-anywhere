import {
  checkManifestCompatibility,
  getDisplayStrings,
  loadManifest,
  type Manifest,
  type ManifestIncompatibility,
  ManifestRunner,
} from '@mr-quin/dango'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type {
  ManifestUnavailableReason,
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
  type ManifestRecord,
  ManifestStore,
} from './ManifestStore'
import {
  ManifestUnavailableError,
  ManifestValidationError,
} from './manifestErrors'

const zCatalogEntry = z.object({
  id: z.string(),
  apiVersion: z.number(),
  minEngineVersion: z.string().optional(),
  version: z.string(),
  file: z.string(),
})

const zCatalogIndex = z.object({
  manifests: z.array(z.unknown()),
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

const INDEX_TIMEOUT_MS = 5000
// File fetches run concurrently, so this only stretches a sync when a file is
// actually slow, typically the first request after a catalog release while
// the edge cache is still cold.
const FILE_TIMEOUT_MS = 15000

function rawString(manifest: unknown, key: string): string | undefined {
  if (manifest === null || typeof manifest !== 'object' || !(key in manifest)) {
    return undefined
  }
  const value: unknown = Reflect.get(manifest, key)
  if (typeof value === 'string') {
    return value
  }
  return undefined
}

function describeIncompatibility(
  incompatibility: ManifestIncompatibility
): string {
  if (incompatibility.reason === 'api-version') {
    return `apiVersion ${incompatibility.apiVersion}`
  }
  return `engine ${incompatibility.minEngineVersion}`
}

interface RegisteredManifest {
  runner: ManifestRunner
  kind: ManifestKind
}

// A stored manifest this build cannot run. It stays in storage untouched, so
// a newer build picks it up again, and is listed so the user can see why the
// source is gone and delete it.
interface UnavailableManifest {
  reason: ManifestUnavailableReason
  kind: ManifestKind
  name: string
  version: string
}

@injectable('Singleton')
export class ManifestRegistry {
  private readonly runners = new Map<string, RegisteredManifest>()
  private readonly unavailable = new Map<string, UnavailableManifest>()
  // Non-user ids whose stored copy cannot run, with the bundled copy running
  // in its place.
  private readonly fallback = new Map<string, ManifestUnavailableReason>()
  private readonly warned = new Set<string>()
  // Mutations run one at a time, so a reinstall cannot interleave with a
  // catalog sync that reads the store and writes it back.
  private mutations: Promise<unknown> = Promise.resolve()
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

  private exclusive<T>(mutation: () => Promise<T>): Promise<T> {
    const run = this.mutations.then(mutation, mutation)
    this.mutations = run.catch(() => undefined)
    return run
  }

  getRunner(manifestId: string): ManifestRunner {
    invariant(this.initialized, 'ManifestRegistry accessed before ready')
    const entry = this.runners.get(manifestId)
    if (entry) {
      return entry.runner
    }
    const unavailable = this.unavailable.get(manifestId)
    if (unavailable) {
      throw new ManifestUnavailableError(manifestId, unavailable.reason)
    }
    throw new ManifestUnavailableError(manifestId, 'not-registered')
  }

  listManifests(locale?: string): ProviderManifestInfo[] {
    invariant(this.initialized, 'ManifestRegistry accessed before ready')
    const available = [...this.runners.values()].map(({ runner, kind }) => {
      const { manifest } = runner
      const display = getDisplayStrings(manifest, locale)
      const info: ProviderManifestInfo = {
        id: manifest.id,
        name: display.name,
        version: manifest.version,
        configSchema: display.configSchema,
        kind,
      }
      const fallback = this.fallback.get(manifest.id)
      if (fallback !== undefined) {
        info.fallback = fallback
      }
      return info
    })
    const unavailable = [...this.unavailable].map(([id, entry]) => ({
      id,
      name: entry.name,
      version: entry.version,
      kind: entry.kind,
      unavailable: entry.reason,
    }))
    return [...available, ...unavailable]
  }

  getLastCheckedAt(): Promise<number | null> {
    return this.store.getLastCheckedAt()
  }

  // Stamp the catalog as freshly synced; the caller decides when it is current.
  recordChecked(): Promise<void> {
    return this.store.setLastCheckedAt(Date.now())
  }

  unregister(manifestId: string): Promise<void> {
    return this.exclusive(async () => {
      await this.ready
      await this.store.remove(manifestId)
      this.runners.delete(manifestId)
      this.unavailable.delete(manifestId)
      this.fallback.delete(manifestId)
    })
  }

  // Replaces a broken non-user stored copy with the bundled copy, or with the
  // catalog copy when there is no usable bundled one. Throws, leaving the
  // stored copy as it was, when neither is available.
  reinstall(manifestId: string): Promise<void> {
    return this.exclusive(async () => {
      await this.ready
      const unavailable = this.unavailable.get(manifestId)
      if (
        unavailable === undefined ||
        unavailable.kind === 'user' ||
        unavailable.reason !== 'invalid-manifest'
      ) {
        throw new Error(`Manifest ${manifestId} cannot be reinstalled`)
      }
      const replacement = await this.findReplacement(manifestId)
      if (replacement === null) {
        throw new Error(
          `No working copy of manifest ${manifestId} to reinstall; try again once the catalog is reachable`
        )
      }
      await this.store.set(manifestId, {
        manifest: replacement.raw,
        kind: replacement.kind,
      })
      this.runners.set(manifestId, {
        runner: this.buildRunner(replacement.parsed),
        kind: replacement.kind,
      })
      this.unavailable.delete(manifestId)
    })
  }

  private async findReplacement(
    manifestId: string
  ): Promise<(CatalogManifest & { kind: ManifestKind }) | null> {
    const raw = bundledManifestRaw(manifestId)
    const bundled = loadManifest(raw)
    if (bundled.status === 'ok') {
      return { raw, parsed: bundled.manifest, kind: 'bundled' }
    }
    const entries = await this.loadIndex()
    const entry = entries?.find((candidate) => candidate.id === manifestId)
    if (entry === undefined) {
      return null
    }
    const fetched = await this.fetchManifest(entry)
    if (fetched === null) {
      return null
    }
    return { ...fetched, kind: 'preinstalled' }
  }

  // A broken stored copy, as opposed to one written for a newer engine, is
  // worth replacing whenever the catalog has a copy this build can run.
  private hasBrokenStoredCopy(manifestId: string): boolean {
    return (
      this.fallback.get(manifestId) === 'invalid-manifest' ||
      this.unavailable.get(manifestId)?.reason === 'invalid-manifest'
    )
  }

  // Add-only except for 'bundled' entries and non-user entries whose stored
  // copy is broken, which the catalog copy replaces with no manual apply. A
  // changed preinstalled manifest surfaces via getPendingUpdates instead. A
  // bundled entry whose file fails to download stays bundled until the next
  // sync.
  update(): Promise<CatalogSyncResult> {
    return this.exclusive(async () => {
      await this.ready
      const entries = await this.loadIndex()
      if (!entries) {
        return 'unreachable'
      }
      if (entries.length === 0) {
        return 'empty'
      }
      const stored = await this.store.getAll()
      const missing = entries.filter((entry) => !stored[entry.id])
      const replaceable = entries.filter((entry) => {
        const existing = stored[entry.id]
        if (existing === undefined || existing.kind === 'user') {
          return false
        }
        return existing.kind === 'bundled' || this.hasBrokenStoredCopy(entry.id)
      })
      await this.fetchAndStore([...missing, ...replaceable])
      return 'synced'
    })
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
      // 'user' is never replaced by the catalog. 'bundled' and broken copies
      // are replaced in update() as soon as the index is reachable, so they
      // must not also surface here as a manual "update available".
      if (
        !existing ||
        existing.kind === 'user' ||
        existing.kind === 'bundled' ||
        this.hasBrokenStoredCopy(entry.id)
      ) {
        continue
      }
      const fromVersion =
        this.runners.get(entry.id)?.runner.manifest.version ??
        rawString(existing.manifest, 'version')
      if (fromVersion !== undefined && fromVersion !== entry.version) {
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
  applyUpdates(manifestIds: string[]): Promise<void> {
    return this.exclusive(async () => {
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
    })
  }

  // Persists a user-authored manifest. The id is the manifest's own id, so the
  // guard reads the store by that id rather than trusting a caller-supplied one.
  // create rejects any existing id (a user manifest must not shadow a built-in
  // or another user manifest); update only touches an id already owned by the
  // user, so a preinstalled manifest can never be edited in place.
  saveUserManifest(
    manifest: unknown,
    mode: 'create' | 'update',
    expectedId?: string
  ): Promise<void> {
    return this.exclusive(async () => {
      await this.ready
      const loaded = loadManifest(manifest)
      if (loaded.status === 'malformed') {
        throw new ManifestValidationError(
          'save-invalid',
          `invalid manifest: ${JSON.stringify(loaded.issues)}`
        )
      }
      if (loaded.status === 'incompatible') {
        throw new ManifestValidationError(
          'save-needs-newer-extension',
          'This manifest needs a newer version of the extension'
        )
      }
      const id = loaded.manifest.id
      // The id is the manifest's identity; an update must target the id being
      // edited, or it would orphan the old entry and could overwrite an
      // unrelated manifest. An omitted expectedId would bypass the check, so it
      // is required.
      if (
        mode === 'update' &&
        (expectedId === undefined || id !== expectedId)
      ) {
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
      const runner = this.buildRunner(loaded.manifest)
      await this.store.set(id, { manifest, kind: 'user' })
      this.runners.set(id, { runner, kind: 'user' })
      this.unavailable.delete(id)
    })
  }

  // Returns the raw manifest JSON (not the parsed runner form) so the editor
  // can show or duplicate exactly what was imported. While the bundled copy
  // stands in for a stored one, that is the copy shown.
  async getSource(manifestId: string): Promise<ManifestEntry | undefined> {
    const stored = await this.store.get(manifestId)
    if (stored === undefined || !this.fallback.has(manifestId)) {
      return stored
    }
    return { manifest: bundledManifestRaw(manifestId), kind: stored.kind }
  }

  // The bundle fills in whatever the store lacks, so the built-in sources exist
  // before any catalog sync.
  private async init(): Promise<void> {
    const record = await this.store.getAll()
    for (const [id, entry] of Object.entries(record)) {
      this.loadEntry(id, entry)
    }
    await this.seedFromBundle(record)
    this.initialized = true
  }

  // Returns the ids actually stored; the caller can compare against what it
  // asked for to tell a partial failure from a complete one.
  private async fetchAndStore(entries: CatalogEntry[]): Promise<string[]> {
    const fetched = (
      await Promise.all(entries.map((entry) => this.fetchManifest(entry)))
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
      this.unavailable.delete(parsed.id)
      this.fallback.delete(parsed.id)
    }
    return fetched.map(({ parsed }) => parsed.id)
  }

  // Tagged 'bundled' rather than 'preinstalled' so update() replaces it
  // outright on the next reachable sync instead of treating it as an
  // installed source pinned until a manual apply.
  private async seedFromBundle(stored: ManifestRecord): Promise<void> {
    const missing = bundledCatalogIndex().filter((entry) => !stored[entry.id])
    if (missing.length === 0) {
      return
    }
    const updates: Record<string, ManifestEntry> = {}
    const toRegister: Manifest[] = []
    for (const entry of missing) {
      const raw = bundledManifestRaw(entry.id)
      const loaded = loadManifest(raw)
      if (loaded.status !== 'ok') {
        this.log.error('Skipping unusable bundled manifest:', entry.id, loaded)
        continue
      }
      updates[loaded.manifest.id] = { manifest: raw, kind: 'bundled' }
      toRegister.push(loaded.manifest)
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

  // A sync reads the index several times (update, pending updates, apply), so
  // a warning about one catalog entry is logged the first time only.
  private warnOnce(key: string, ...args: unknown[]): void {
    if (this.warned.has(key)) {
      return
    }
    this.warned.add(key)
    this.log.warn(...args)
  }

  private async fetchIndex(): Promise<CatalogEntry[]> {
    const index = zCatalogIndex.parse(
      await this.fetchJson(`${this.baseUrl}/manifest`, INDEX_TIMEOUT_MS)
    )
    const entries: CatalogEntry[] = []
    for (const candidate of index.manifests) {
      const parsed = zCatalogEntry.safeParse(candidate)
      if (!parsed.success) {
        this.warnOnce(
          `malformed:${JSON.stringify(candidate)}`,
          'Dropping malformed catalog entry:',
          candidate
        )
        continue
      }
      const entry = parsed.data
      const compatibility = checkManifestCompatibility(entry)
      if (compatibility.compatible) {
        entries.push(entry)
        continue
      }
      if (compatibility.reason === 'api-version') {
        this.warnOnce(
          `api:${entry.id}@${entry.version}`,
          'Dropping catalog manifest with unsupported apiVersion:',
          entry.id,
          compatibility.apiVersion
        )
      } else {
        this.warnOnce(
          `engine:${entry.id}@${entry.version}`,
          'Dropping catalog manifest that needs a newer engine:',
          entry.id,
          compatibility.minEngineVersion
        )
      }
    }
    return entries
  }

  // Skip (null) on any per-manifest failure so one bad file doesn't block the
  // rest; the next sync retries whatever is still missing or bundled.
  private async fetchManifest(
    entry: CatalogEntry
  ): Promise<CatalogManifest | null> {
    const { id, file } = entry
    let raw: unknown
    try {
      raw = await this.fetchJson(
        `${this.baseUrl}/manifest/file?file=${encodeURIComponent(file)}`,
        FILE_TIMEOUT_MS
      )
    } catch (e) {
      this.log.error('Failed to fetch catalog manifest:', id, file, e)
      return null
    }
    const loaded = loadManifest(raw)
    if (loaded.status === 'incompatible') {
      this.warnOnce(
        `engine:${id}@${entry.version}`,
        'Skipping catalog manifest that needs a newer engine:',
        id,
        describeIncompatibility(loaded.incompatibility)
      )
      return null
    }
    if (loaded.status === 'malformed') {
      this.log.error('Skipping invalid catalog manifest:', id, loaded.issues)
      return null
    }
    // The store keys by the manifest's own id; a mismatch with the catalog id
    // would store it under the wrong key and loop as a never-resolving update.
    if (loaded.manifest.id !== id) {
      this.log.error(
        'Skipping catalog manifest with mismatched id:',
        id,
        loaded.manifest.id
      )
      return null
    }
    return { raw, parsed: loaded.manifest }
  }

  private async fetchJson(url: string, timeoutMs: number): Promise<unknown> {
    const res = await extensionFetchLike(url, {
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (res.status !== 200) {
      throw new Error(`catalog fetch failed (${res.status}): ${url}`)
    }
    return JSON.parse(await res.text())
  }

  // Per-manifest, and runner construction can throw past parsing, so one bad
  // stored spec can't take the whole registry down on startup.
  private loadEntry(id: string, entry: ManifestEntry): void {
    const loaded = loadManifest(entry.manifest)
    if (loaded.status === 'ok') {
      try {
        this.runners.set(id, {
          runner: this.buildRunner(loaded.manifest),
          kind: entry.kind,
        })
        return
      } catch (e) {
        this.log.error('Failed to build runner for manifest:', id, e)
      }
    } else if (loaded.status === 'incompatible') {
      this.log.warn(
        'Stored manifest needs a newer engine:',
        id,
        describeIncompatibility(loaded.incompatibility)
      )
    } else {
      this.log.error('Failed to load manifest:', id, loaded.issues)
    }
    const reason: ManifestUnavailableReason =
      loaded.status === 'incompatible'
        ? 'needs-newer-extension'
        : 'invalid-manifest'
    if (entry.kind !== 'user' && this.loadBundledFallback(id, entry.kind)) {
      this.fallback.set(id, reason)
      return
    }
    this.unavailable.set(id, {
      reason,
      kind: entry.kind,
      name: rawString(entry.manifest, 'name') ?? id,
      version: rawString(entry.manifest, 'version') ?? '',
    })
  }

  // Runs the bundled copy in memory only: the stored manifest stays, so
  // going back to a build that can run it restores it as it was.
  private loadBundledFallback(id: string, kind: ManifestKind): boolean {
    const loaded = loadManifest(bundledManifestRaw(id))
    if (loaded.status !== 'ok') {
      return false
    }
    this.log.warn('Running the bundled copy of manifest:', id)
    this.runners.set(id, { runner: this.buildRunner(loaded.manifest), kind })
    return true
  }

  private buildRunner(manifest: Manifest): ManifestRunner {
    return new ManifestRunner(manifest, { fetcher: extensionFetchLike })
  }
}
