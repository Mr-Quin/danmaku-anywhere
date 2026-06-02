import { inject, injectable, optional } from 'inversify'
import { IS_DA_E2E } from '@/common/constants'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { BASELINE_MANIFEST, DEFAULT_MODEL_ID, MANIFEST_URL } from './baseline'
import {
  type ModelEntry,
  type ModelManifest,
  modelManifestSchema,
} from './schema'

/** Test seam: lets unit tests inject a fake fetch so no network is touched. */
export const ModelManifestFetchSymbol = Symbol.for('ModelManifestFetch')

/**
 * Single source of truth for the available segmentation models: fetches the
 * hosted manifest from R2, validates it, and falls back to the bundled baseline
 * when the network or payload is bad (so occlusion works offline and before the
 * manifest is uploaded). Persistence across worker restarts is the browser HTTP
 * cache's job, governed by the manifest's Cache-Control; the manual refresh
 * bypasses that cache. Lives in the background worker; reached over RPC.
 */
@injectable('Singleton')
export class ModelManifestService {
  private readonly logger: ILogger
  private readonly fetchFn: typeof fetch
  private cache?: ModelManifest

  constructor(
    @inject(LoggerSymbol) logger: ILogger,
    @optional() @inject(ModelManifestFetchSymbol) fetchFn?: typeof fetch
  ) {
    this.logger = logger.sub('[ModelManifestService]')
    this.fetchFn = fetchFn ?? globalThis.fetch.bind(globalThis)
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

  /** Manual refresh: bypass the cache to pick up a just-uploaded manifest. */
  async refresh(): Promise<ModelEntry[]> {
    this.cache = await this.fetchManifest(true)
    return this.cache.models
  }

  private async getManifest(): Promise<ModelManifest> {
    if (!this.cache) {
      this.cache = await this.fetchManifest(false)
    }
    return this.cache
  }

  private async fetchManifest(bypassCache: boolean): Promise<ModelManifest> {
    if (IS_DA_E2E) {
      return BASELINE_MANIFEST
    }
    try {
      // Lazy loads ride the browser HTTP cache (the manifest's Cache-Control is
      // the TTL). The manual refresh bypasses it with a unique query + no-store
      // so a just-uploaded manifest is seen immediately even behind a CDN.
      const url = bypassCache ? `${MANIFEST_URL}?t=${Date.now()}` : MANIFEST_URL
      const res = await this.fetchFn(url, {
        cache: bypassCache ? 'no-store' : 'default',
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) {
        throw new Error(`manifest fetch failed (${res.status})`)
      }
      return modelManifestSchema.parse(await res.json())
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      this.logger.debug(`falling back to baseline manifest: ${detail}`)
      // Keep a manifest already resolved this session; only cold-start failures
      // land on the baseline.
      return this.cache ?? BASELINE_MANIFEST
    }
  }
}
