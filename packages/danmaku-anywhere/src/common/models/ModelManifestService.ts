import { inject, injectable, optional } from 'inversify'
import { IS_DA_E2E } from '@/common/constants'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { BASELINE_MANIFEST, DEFAULT_MODEL_ID, MANIFEST_URL } from './baseline'
import {
  type ModelEntry,
  type ModelManifest,
  modelManifestSchema,
} from './schema'

const TTL_MS = 24 * 60 * 60 * 1000
const CACHE_KEY = 'modelManifestCache'

interface ManifestCacheRecord {
  manifest: ModelManifest
  fetchedAt: number
}

/** IO surface the service depends on; tests inject a fake. */
export interface ModelManifestIo {
  fetch: typeof fetch
  now: () => number
  readCache: () => Promise<unknown>
  writeCache: (record: ManifestCacheRecord) => Promise<void>
}

export const ModelManifestIoSymbol = Symbol.for('ModelManifestIo')

function createDefaultIo(): ModelManifestIo {
  return {
    fetch: globalThis.fetch.bind(globalThis),
    now: () => Date.now(),
    async readCache() {
      const area = globalThis.chrome?.storage?.local
      if (!area) {
        return null
      }
      const res = await area.get(CACHE_KEY)
      return res?.[CACHE_KEY] ?? null
    },
    async writeCache(record) {
      const area = globalThis.chrome?.storage?.local
      if (!area) {
        return
      }
      await area.set({ [CACHE_KEY]: record })
    },
  }
}

/**
 * Single source of truth for the available segmentation models. Resolves the
 * hosted manifest (fetched from R2, validated, cached in chrome.storage.local
 * for ~24h) and falls back to the bundled baseline when the network or payload
 * is bad, so occlusion keeps working offline and before the manifest exists.
 * Replaces the old static descriptor map; OPFS-bound, so it lives in the
 * background worker and the rest of the extension reaches it over RPC.
 */
@injectable('Singleton')
export class ModelManifestService {
  private readonly logger: ILogger
  private readonly io: ModelManifestIo
  private cache?: ModelManifest
  // Coalesces concurrent first-time resolves (e.g. occlusion start + the
  // settings UI opening at once) into a single storage read / network fetch.
  private manifestPromise?: Promise<ModelManifest>

  constructor(
    @inject(LoggerSymbol) logger: ILogger,
    @optional() @inject(ModelManifestIoSymbol) io?: ModelManifestIo
  ) {
    this.logger = logger.sub('[ModelManifestService]')
    this.io = io ?? createDefaultIo()
  }

  async listModels(): Promise<ModelEntry[]> {
    return (await this.getManifest()).models
  }

  async getModel(id: string): Promise<ModelEntry | undefined> {
    return (await this.getManifest()).models.find((model) => model.id === id)
  }

  /** Resolves a saved id to a usable model, falling back to the default. */
  async resolveModel(id: string): Promise<ModelEntry> {
    const { models } = await this.getManifest()
    return (
      models.find((model) => model.id === id) ??
      models.find((model) => model.id === DEFAULT_MODEL_ID) ??
      models[0]
    )
  }

  /** Forces a re-fetch regardless of the cache TTL (the manual refresh button). */
  async refresh(): Promise<ModelEntry[]> {
    this.cache = await this.fetchRemote(this.cache)
    return this.cache.models
  }

  private async getManifest(): Promise<ModelManifest> {
    if (this.cache) {
      return this.cache
    }
    if (!this.manifestPromise) {
      this.manifestPromise = this.loadManifest().finally(() => {
        this.manifestPromise = undefined
      })
    }
    return this.manifestPromise
  }

  private async loadManifest(): Promise<ModelManifest> {
    const record = this.parseRecord(await this.io.readCache().catch(() => null))
    if (record && this.io.now() - record.fetchedAt < TTL_MS) {
      this.cache = record.manifest
      return this.cache
    }
    this.cache = await this.fetchRemote(record?.manifest)
    return this.cache
  }

  private async fetchRemote(
    fallback: ModelManifest | undefined
  ): Promise<ModelManifest> {
    if (IS_DA_E2E) {
      return fallback ?? BASELINE_MANIFEST
    }
    try {
      const res = await this.io.fetch(MANIFEST_URL)
      if (!res.ok) {
        throw new Error(`manifest fetch failed (${res.status})`)
      }
      const manifest = modelManifestSchema.parse(await res.json())
      await this.io
        .writeCache({ manifest, fetchedAt: this.io.now() })
        .catch(() => undefined)
      return manifest
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      this.logger.debug(
        `falling back to ${fallback ? 'cached' : 'baseline'} manifest: ${detail}`
      )
      return fallback ?? BASELINE_MANIFEST
    }
  }

  private parseRecord(raw: unknown): ManifestCacheRecord | null {
    if (!raw || typeof raw !== 'object') {
      return null
    }
    const record = raw as { manifest?: unknown; fetchedAt?: unknown }
    if (typeof record.fetchedAt !== 'number') {
      return null
    }
    const parsed = modelManifestSchema.safeParse(record.manifest)
    if (!parsed.success) {
      return null
    }
    return { manifest: parsed.data, fetchedAt: record.fetchedAt }
  }
}
