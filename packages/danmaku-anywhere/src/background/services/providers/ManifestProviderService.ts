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
  ParseUrlResult,
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

interface ManifestParseUrlOutput {
  seasonInsert: ManifestSearchRow
  // Pipeline emits undefined when the URL pattern matched but the API
  // response did not yield a matching episode. The host treats that as a
  // hard error (URL is on a recognized host, but we can't resolve it).
  episodeMeta?: ManifestEpisodeRow
}

export interface ManifestProviderConfig {
  manifestId: string
  provider: DanmakuSourceType
  providerConfigId: string
  // Per-call extra inputs threaded into every pipeline run. Used by
  // DDP-Compat to inject the user-configured `baseUrl` / `authHeaders`.
  extraInputs?: () => Record<string, unknown>
  // Per-row danmaku transform. DDP's manifest output already matches
  // CommentEntity shape (identity). Bilibili and Tencent need to convert
  // raw protobuf-decoded elems / barrage items into CommentEntity.
  // Goes away when DA-477's per-row `map` step kind lands.
  commentMapper?: (raw: unknown) => CommentEntity[]
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

  private resolveInputs(
    inputs: Record<string, unknown>
  ): Record<string, unknown> {
    const extras = this.config.extraInputs ? this.config.extraInputs() : {}
    return { ...inputs, ...extras }
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
    if (this.config.commentMapper) {
      return this.config.commentMapper(raw)
    }
    return raw as CommentEntity[]
  }

  async findEpisode(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null> {
    const episodes = await this.getEpisodes(season.providerIds)
    if (episodes.length === 0) {
      throw new Error(`No episodes found for season: ${season.title}`)
    }
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

  canParse(url: string): boolean {
    return this.registry.getRunner(this.config.manifestId).canParse(url)
  }

  async parseUrl(url: string): Promise<ParseUrlResult | null> {
    this.logger.debug('Parse URL via manifest', this.config.manifestId, url)
    const runner = this.registry.getRunner(this.config.manifestId)
    const extras = this.config.extraInputs ? this.config.extraInputs() : {}
    const result = await runner.runParseUrl<ManifestParseUrlOutput>(url, extras)
    if (result === null) return null
    if (result.episodeMeta === undefined) {
      throw new Error(`Could not resolve episode for url: ${url}`)
    }
    const now = Date.now()
    return {
      seasonInsert: {
        ...result.seasonInsert,
        title: stripHtml(result.seasonInsert.title),
        provider: this.forProvider,
        providerConfigId: this.config.providerConfigId,
        schemaVersion: SEASON_SCHEMA_VERSION,
      },
      episodeMeta: {
        ...result.episodeMeta,
        title: stripHtml(result.episodeMeta.title),
        provider: this.forProvider,
        schemaVersion: EPISODE_SCHEMA_VERSION,
        lastChecked: now,
      },
    }
  }
}
