import {
  type CommentEntity,
  EPISODE_SCHEMA_VERSION,
  type EpisodeMeta,
  SEASON_SCHEMA_VERSION,
  type Season,
  type SeasonInsert,
  stripHtml,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'
import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { ILogger } from '@/common/Logger'
import { findEpisodeByNumber } from './common/findEpisodeByNumber'
import type {
  IDanmakuProvider,
  OmitSeasonId,
  SeasonSearchParams,
} from './IDanmakuProvider'
import type { ManifestRegistry } from './ManifestRegistry'

// Manifest output shapes — the canonical fields a search/episodes/danmaku
// pipeline must emit. The host adds `provider` / `providerConfigId` /
// `schemaVersion` and runs `stripHtml` on titles.
interface ManifestSearchRow {
  providerIds: Record<string, unknown>
  indexedId: string
  title: string
  type: string
  imageUrl?: string
  episodeCount?: number
  year?: number
  alternativeTitles?: string[]
  externalLink?: string
}

interface ManifestEpisodeRow {
  providerIds: Record<string, unknown>
  indexedId: string
  title: string
  episodeNumber?: number | string
  imageUrl?: string
  alternativeTitle?: string[]
  externalLink?: string
}

export interface ManifestProviderConfig {
  manifestId: string
  provider: DanmakuSourceType
  providerConfigId: string
  // Per-call extra inputs threaded into every pipeline run. Used by
  // DDP-Compat to inject the user-configured `baseUrl` / `authHeaders`.
  extraInputs?: () => Record<string, unknown>
  // Per-row danmaku transform. Required: every built-in source declares one,
  // including DDP (whose mapper is an explicit identity cast — see
  // DanDanPlayMapper). Goes away when DA-477's per-row `map` step kind moves
  // the transform into the manifest.
  commentMapper: (raw: unknown) => CommentEntity[]
}

export class ManifestProviderService implements IDanmakuProvider {
  readonly forProvider: DanmakuSourceType

  constructor(
    private readonly config: ManifestProviderConfig,
    private readonly registry: ManifestRegistry,
    private readonly logger: ILogger
  ) {
    this.forProvider = config.provider
  }

  // Merge order matters: per-call inputs at the base, then manifest config
  // defaults, then user-saved configValues from extraInputs. Defaults fire
  // only for keys the user hasn't explicitly set. This keeps the source of
  // truth for defaults in the manifest's configSchema instead of letting
  // code-level `?? 'xml'` fallbacks silently downgrade users whose stored
  // configValues are missing the key entirely.
  private resolveInputs(
    inputs: Record<string, unknown>
  ): Record<string, unknown> {
    const runner = this.registry.getRunner(this.config.manifestId)
    const defaults = runner.configDefaults()
    const rawExtras = this.config.extraInputs ? this.config.extraInputs() : {}
    // Drop undefined values so they don't blank out manifest defaults.
    const extras: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rawExtras)) {
      if (v !== undefined) {
        extras[k] = v
      }
    }
    return { ...inputs, ...defaults, ...extras }
  }

  async search(params: SeasonSearchParams): Promise<SeasonInsert[]> {
    this.logger.debug('Search via manifest', this.config.manifestId, params)
    const runner = this.registry.getRunner(this.config.manifestId)
    const inputs = this.resolveInputs({ q: params.keyword })
    const rows = await runner.runSearch<ManifestSearchRow[]>(inputs)
    return rows.map((row) => ({
      ...row,
      title: stripHtml(row.title),
      provider: this.forProvider,
      providerConfigId: this.config.providerConfigId,
      schemaVersion: SEASON_SCHEMA_VERSION,
    }))
  }

  async getEpisodes(
    seasonRemoteIds: Season['providerIds']
  ): Promise<OmitSeasonId<EpisodeMeta>[]> {
    this.logger.debug(
      'Get episodes via manifest',
      this.config.manifestId,
      seasonRemoteIds
    )
    const runner = this.registry.getRunner(this.config.manifestId)
    const inputs = this.resolveInputs(seasonRemoteIds)
    const rows = await runner.runEpisodes<ManifestEpisodeRow[]>(inputs)
    const now = Date.now()
    return rows.map((row) => ({
      ...row,
      title: stripHtml(row.title),
      provider: this.forProvider,
      schemaVersion: EPISODE_SCHEMA_VERSION,
      lastChecked: now,
    }))
  }

  async getDanmaku(request: DanmakuFetchByMeta): Promise<CommentEntity[]> {
    const { meta } = request
    this.logger.debug(
      'Get danmaku via manifest',
      this.config.manifestId,
      meta.providerIds
    )
    const runner = this.registry.getRunner(this.config.manifestId)
    const inputs = this.resolveInputs(meta.providerIds)
    const raw = await runner.runDanmaku<unknown>(inputs)
    return this.config.commentMapper(raw)
  }

  async findEpisode(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null> {
    const episodes = await this.getEpisodes(season.providerIds)
    // Empty episodes is a legitimate "no match" result, not an exception.
    // `findEpisodeByNumber` already returns null on an empty array.
    const episode = findEpisodeByNumber(episodes, episodeNumber)
    if (!episode) {
      return null
    }
    return {
      ...episode,
      seasonId: season.id,
      season,
    }
  }
}
