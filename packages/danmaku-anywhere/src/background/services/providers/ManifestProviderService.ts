import { DdplayAdapter } from '@dan-uni/dan-any/adapters'
import type { UniChunk } from '@dan-uni/dan-any/core'
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
import type { ManifestRunner, RunOptions } from '@mr-quin/dango'
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
import { resolveManifestInputs } from './manifestInputs'

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
  configValues?: Record<string, unknown>
}

// Permit requests to private/loopback hosts so a config pointed at a
// self-hosted local server resolves instead of being blocked.
export const MANIFEST_RUN_OPTIONS: RunOptions = { allowPrivateHosts: true }

// A danmaku run fans out across segments; tolerate a failed segment so one
// missing segment doesn't drop the whole overlay.
export const DANMAKU_RUN_OPTIONS: RunOptions = {
  ...MANIFEST_RUN_OPTIONS,
  continueOnError: true,
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
    runner: ManifestRunner,
    inputs: Record<string, unknown>
  ): Record<string, unknown> {
    return resolveManifestInputs(
      runner.configDefaults(),
      this.config.configValues,
      inputs
    )
  }

  async search(params: SeasonSearchParams): Promise<SeasonInsert[]> {
    this.logger.debug('Search via manifest', this.config.manifestId, params)
    const runner = this.registry.getRunner(this.config.manifestId)
    const inputs = this.resolveInputs(runner, { q: params.keyword })
    const rows = await runner.runSearch<ManifestSearchRow[]>(
      inputs,
      MANIFEST_RUN_OPTIONS
    )
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
    const inputs = this.resolveInputs(runner, seasonRemoteIds)
    const row = await runner.runSeason<ManifestSearchRow | null>(
      inputs,
      MANIFEST_RUN_OPTIONS
    )
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
    const inputs = this.resolveInputs(runner, seasonRemoteIds)
    const rows = await runner.runEpisodes<ManifestEpisodeRow[]>(
      inputs,
      MANIFEST_RUN_OPTIONS
    )
    const now = Date.now()
    // Type assertion: manifestId determines provider type at runtime
    return rows.map((row) => ({
      ...row,
      title: stripHtml(row.title),
      provider: this.forProvider,
      schemaVersion: EPISODE_SCHEMA_VERSION,
      lastChecked: now,
    })) as OmitSeasonId<EpisodeMeta>[]
  }

  async getDanmaku(
    uchunk: UniChunk,
    request: DanmakuFetchByMeta
  ): Promise<UniChunk> {
    const { meta } = request
    this.logger.debug(
      'Get danmaku via manifest',
      this.config.manifestId,
      meta.providerIds
    )
    const runner = this.registry.getRunner(this.config.manifestId)
    const inputs = this.resolveInputs(runner, {
      ...(meta.params ?? {}),
      ...meta.providerIds,
    })
    // Manifest runner returns CommentEntity[] directly
    const rawComments = await runner.runDanmaku<CommentEntity[]>(
      inputs,
      DANMAKU_RUN_OPTIONS
    )

    // Use V4EpisodeAdapter to convert and import CommentEntity[] to UDanmaku
    const tempEpisode = {
      comments: rawComments as (Omit<CommentEntity, 'cid'> & { cid: number })[],
      count: rawComments.length,
    }

    // adapter populates the chunk and returns it
    const populatedChunk = uchunk.import(DdplayAdapter(tempEpisode))

    return populatedChunk
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

  canParse(url: string): boolean {
    return this.registry.getRunner(this.config.manifestId).canParse(url)
  }

  async parseUrl(url: string): Promise<ParseUrlResult | null> {
    this.logger.debug('Parse URL via manifest', this.config.manifestId, url)
    const runner = this.registry.getRunner(this.config.manifestId)
    const result = await runner.runParseUrl<ManifestParseUrlOutput>(
      url,
      undefined,
      MANIFEST_RUN_OPTIONS
    )
    if (result === null) {
      return null
    }
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
        provider: this.forProvider as any,
        schemaVersion: EPISODE_SCHEMA_VERSION,
        lastChecked: now,
      } as OmitSeasonId<EpisodeMeta>,
    }
  }
}
