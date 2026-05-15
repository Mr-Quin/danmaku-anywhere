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
  // Per-row danmaku transform. Goes away when DA-477's per-row `map` step
  // kind moves the transform into the manifest.
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

  // Merge precedence (low → high): manifest defaults, per-call inputs,
  // user extras. Per-call inputs (q, seasonId, cid, ...) must win over any
  // configSchema default that happens to declare a same-named key.
  // Undefined extras are dropped so they don't blank out lower layers.
  private resolveInputs(
    inputs: Record<string, unknown>
  ): Record<string, unknown> {
    const runner = this.registry.getRunner(this.config.manifestId)
    const defaults = runner.configDefaults()
    const rawExtras = this.config.extraInputs ? this.config.extraInputs() : {}
    const extras: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rawExtras)) {
      if (v !== undefined) {
        extras[k] = v
      }
    }
    return { ...defaults, ...inputs, ...extras }
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

  async getSeason(
    seasonRemoteIds: Season['providerIds']
  ): Promise<SeasonInsert | null> {
    this.logger.debug(
      'Get season via manifest',
      this.config.manifestId,
      seasonRemoteIds
    )
    const runner = this.registry.getRunner(this.config.manifestId)
    if (!runner.hasSeason()) {
      return null
    }
    const inputs = this.resolveInputs(seasonRemoteIds)
    const row = await runner.runSeason<ManifestSearchRow | null>(inputs)
    if (row === null) {
      return null
    }
    return {
      ...row,
      title: stripHtml(row.title),
      provider: this.forProvider,
      providerConfigId: this.config.providerConfigId,
      schemaVersion: SEASON_SCHEMA_VERSION,
    }
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
