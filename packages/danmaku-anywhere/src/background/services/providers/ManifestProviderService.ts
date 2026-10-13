import {
  type CommentEntity,
  EPISODE_SCHEMA_VERSION,
  type EpisodeMeta,
  SEASON_SCHEMA_VERSION,
  type Season,
  type SeasonInsert,
  stripHtml,
  type WithSeason,
  zCommentEntity,
} from '@danmaku-anywhere/danmaku-converter'
import {
  type EpisodeRow,
  type ManifestRunner,
  type RunOptions,
  type SearchRow,
  zEpisodeRow,
  zParseUrlOutput,
  zSearchRow,
  zSeasonRow,
} from '@mr-quin/dango'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'
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
import {
  type ManifestPipeline,
  type OutputSchema,
  parseOutputRows,
  parseOutputValue,
} from './manifestOutput'

export interface ManifestProviderConfig {
  manifestId: string
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
  constructor(
    private readonly config: ManifestProviderConfig,
    private readonly registry: ManifestRegistry,
    private readonly logger: ILogger
  ) {}

  private parseRows<T>(
    pipeline: ManifestPipeline,
    schema: OutputSchema<T>,
    output: unknown
  ): T[] {
    return parseOutputRows(
      schema,
      output,
      { manifestId: this.config.manifestId, pipeline },
      this.logger
    )
  }

  private parseValue<T>(
    pipeline: ManifestPipeline,
    schema: OutputSchema<T>,
    output: unknown
  ): T {
    return parseOutputValue(schema, output, {
      manifestId: this.config.manifestId,
      pipeline,
    })
  }

  private toSeasonInsert(row: SearchRow): SeasonInsert {
    return {
      ...row,
      type: row.type ?? '',
      title: stripHtml(row.title),
      manifestId: this.config.manifestId,
      providerConfigId: this.config.providerConfigId,
      schemaVersion: SEASON_SCHEMA_VERSION,
    }
  }

  private toEpisodeMeta(
    row: EpisodeRow,
    lastChecked: number
  ): OmitSeasonId<EpisodeMeta> {
    return {
      ...row,
      title: stripHtml(row.title),
      schemaVersion: EPISODE_SCHEMA_VERSION,
      lastChecked,
    }
  }

  private async getRunner(): Promise<ManifestRunner> {
    await this.registry.ready
    return this.registry.getRunner(this.config.manifestId)
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
    const runner = await this.getRunner()
    const inputs = this.resolveInputs(runner, { q: params.keyword })
    const output = await runner.runSearch(inputs, MANIFEST_RUN_OPTIONS)
    return this.parseRows('search', zSearchRow, output).map((row) =>
      this.toSeasonInsert(row)
    )
  }

  async getSeason(
    seasonRemoteIds: Season['providerIds']
  ): Promise<SeasonInsert | null> {
    this.logger.debug(
      'Get season via manifest',
      this.config.manifestId,
      seasonRemoteIds
    )
    const runner = await this.getRunner()
    if (!runner.hasSeason()) {
      return null
    }
    const inputs = this.resolveInputs(runner, seasonRemoteIds)
    const output = await runner.runSeason(inputs, MANIFEST_RUN_OPTIONS)
    // A season pipeline yields nothing when the source no longer has the season.
    if (output === null || output === undefined) {
      return null
    }
    return this.toSeasonInsert(this.parseValue('season', zSeasonRow, output))
  }

  async getEpisodes(
    seasonRemoteIds: Season['providerIds']
  ): Promise<OmitSeasonId<EpisodeMeta>[]> {
    this.logger.debug(
      'Get episodes via manifest',
      this.config.manifestId,
      seasonRemoteIds
    )
    const runner = await this.getRunner()
    const inputs = this.resolveInputs(runner, seasonRemoteIds)
    const output = await runner.runEpisodes(inputs, MANIFEST_RUN_OPTIONS)
    const now = Date.now()
    return this.parseRows('episodes', zEpisodeRow, output).map((row) =>
      this.toEpisodeMeta(row, now)
    )
  }

  async getDanmaku(request: DanmakuFetchByMeta): Promise<CommentEntity[]> {
    const { meta } = request
    this.logger.debug(
      'Get danmaku via manifest',
      this.config.manifestId,
      meta.providerIds
    )
    const runner = await this.getRunner()
    // meta.params holds per-episode hints stashed at search/episodes time
    // (e.g. chConvert/withRelated). providerIds take precedence on key collision.
    const inputs = this.resolveInputs(runner, {
      ...meta.params,
      ...meta.providerIds,
    })
    const output = await runner.runDanmaku(inputs, DANMAKU_RUN_OPTIONS)
    // Stricter than dango's zCommentRow: it also rejects comment options the
    // renderer cannot parse.
    return this.parseRows('danmaku', zCommentEntity, output)
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

  // Synchronous, so the caller must await the registry's ready first.
  canParse(url: string): boolean {
    return this.registry.getRunner(this.config.manifestId).canParse(url)
  }

  async parseUrl(url: string): Promise<ParseUrlResult | null> {
    this.logger.debug('Parse URL via manifest', this.config.manifestId, url)
    const runner = await this.getRunner()
    const output = await runner.runParseUrl(
      url,
      undefined,
      MANIFEST_RUN_OPTIONS
    )
    if (output === null) {
      return null
    }
    const { seasonInsert, episodeMeta } = this.parseValue(
      'parseUrl',
      zParseUrlOutput,
      output
    )
    if (episodeMeta === undefined) {
      throw new Error(`Could not resolve episode for url: ${url}`)
    }
    return {
      seasonInsert: this.toSeasonInsert(seasonInsert),
      episodeMeta: this.toEpisodeMeta(episodeMeta, Date.now()),
    }
  }
}
