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
import type { ManifestRunner, RunOptions } from '@mr-quin/dango'
import type { z } from 'zod'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'
import { AppError, type SourceRef } from '@/common/errors/AppError'
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
import { fromDangoError } from './providerErrors'

// Manifest output shapes: the canonical fields a search/episodes/danmaku
// pipeline must emit. The host adds `manifestId` / `providerConfigId` /
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

interface DanmakuParseResult {
  comments: CommentEntity[]
  dropped: number
  firstIssue: string | undefined
}

function formatFirstIssue(error: z.ZodError): string {
  const [issue] = error.issues
  return `${issue.path.join('.')}: ${issue.message}`
}

function describeType(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  return typeof value
}

function parseComments(rows: unknown[]): DanmakuParseResult {
  const comments: CommentEntity[] = []
  let dropped = 0
  let firstIssue: string | undefined
  for (const row of rows) {
    const parsed = zCommentEntity.safeParse(row)
    if (parsed.success) {
      comments.push(parsed.data)
      continue
    }
    dropped += 1
    if (firstIssue === undefined) {
      firstIssue = formatFirstIssue(parsed.error)
    }
  }
  return { comments, dropped, firstIssue }
}

export interface ManifestProviderConfig {
  source: SourceRef
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

  private stampSeason(row: ManifestSearchRow): SeasonInsert {
    return {
      ...row,
      title: stripHtml(row.title),
      manifestId: this.config.source.manifestId,
      providerConfigId: this.config.source.providerConfigId,
      schemaVersion: SEASON_SCHEMA_VERSION,
    }
  }

  private async getRunner(): Promise<ManifestRunner> {
    await this.registry.ready
    return this.registry.getRunner(this.config.source.manifestId)
  }

  private async run<T>(pipeline: () => Promise<T>): Promise<T> {
    try {
      return await pipeline()
    } catch (e) {
      throw fromDangoError(e, this.config.source)
    }
  }

  private badResponse(message: string): AppError {
    return new AppError(
      'badResponse',
      { target: { kind: 'source', ref: this.config.source } },
      { message }
    )
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
    this.logger.debug(
      'Search via manifest',
      this.config.source.manifestId,
      params
    )
    const runner = await this.getRunner()
    const inputs = this.resolveInputs(runner, { q: params.keyword })
    const rows = await this.run(() =>
      runner.runSearch<ManifestSearchRow[]>(inputs, MANIFEST_RUN_OPTIONS)
    )
    return rows.map((row) => this.stampSeason(row))
  }

  async getSeason(
    seasonRemoteIds: Season['providerIds']
  ): Promise<SeasonInsert | null> {
    this.logger.debug(
      'Get season via manifest',
      this.config.source.manifestId,
      seasonRemoteIds
    )
    const runner = await this.getRunner()
    if (!runner.hasSeason()) {
      return null
    }
    const inputs = this.resolveInputs(runner, seasonRemoteIds)
    const row = await this.run(() =>
      runner.runSeason<ManifestSearchRow | null>(inputs, MANIFEST_RUN_OPTIONS)
    )
    if (row === null) {
      return null
    }
    return this.stampSeason(row)
  }

  async getEpisodes(
    seasonRemoteIds: Season['providerIds']
  ): Promise<OmitSeasonId<EpisodeMeta>[]> {
    this.logger.debug(
      'Get episodes via manifest',
      this.config.source.manifestId,
      seasonRemoteIds
    )
    const runner = await this.getRunner()
    const inputs = this.resolveInputs(runner, seasonRemoteIds)
    const rows = await this.run(() =>
      runner.runEpisodes<ManifestEpisodeRow[]>(inputs, MANIFEST_RUN_OPTIONS)
    )
    const now = Date.now()
    return rows.map((row) => ({
      ...row,
      title: stripHtml(row.title),
      schemaVersion: EPISODE_SCHEMA_VERSION,
      lastChecked: now,
    }))
  }

  async getDanmaku(request: DanmakuFetchByMeta): Promise<CommentEntity[]> {
    const { meta } = request
    this.logger.debug(
      'Get danmaku via manifest',
      this.config.source.manifestId,
      meta.providerIds
    )
    const runner = await this.getRunner()
    // meta.params holds per-episode hints stashed at search/episodes time
    // (e.g. chConvert/withRelated). providerIds take precedence on key collision.
    const inputs = this.resolveInputs(runner, {
      ...meta.params,
      ...meta.providerIds,
    })
    const output = await this.run(() =>
      runner.runDanmaku<unknown>(inputs, DANMAKU_RUN_OPTIONS)
    )
    if (!Array.isArray(output)) {
      throw this.badResponse(
        `Danmaku output from manifest ${this.config.source.manifestId} is not an array, got ${describeType(output)}`
      )
    }
    const { comments, dropped, firstIssue } = parseComments(output)
    if (dropped > 0) {
      this.logger.warn(
        `Dropped ${dropped} malformed comment(s) from manifest ${this.config.source.manifestId}, first: ${firstIssue}`
      )
    }
    // Rows in but nothing usable out means the pipeline itself is wrong, not
    // an episode that happens to have no danmaku.
    if (comments.length === 0 && output.length > 0) {
      throw this.badResponse(
        `Every comment from manifest ${this.config.source.manifestId} was malformed, first: ${firstIssue}`
      )
    }
    return comments
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
    return this.registry.getRunner(this.config.source.manifestId).canParse(url)
  }

  async parseUrl(url: string): Promise<ParseUrlResult | null> {
    this.logger.debug(
      'Parse URL via manifest',
      this.config.source.manifestId,
      url
    )
    const runner = await this.getRunner()
    const result = await this.run(() =>
      runner.runParseUrl<ManifestParseUrlOutput>(
        url,
        undefined,
        MANIFEST_RUN_OPTIONS
      )
    )
    if (result === null) {
      return null
    }
    if (result.episodeMeta === undefined) {
      throw new AppError(
        'source.urlEpisodeNotFound',
        {},
        { message: `Could not resolve episode for url: ${url}` }
      )
    }
    const now = Date.now()
    return {
      seasonInsert: this.stampSeason(result.seasonInsert),
      episodeMeta: {
        ...result.episodeMeta,
        title: stripHtml(result.episodeMeta.title),
        schemaVersion: EPISODE_SCHEMA_VERSION,
        lastChecked: now,
      },
    }
  }
}
