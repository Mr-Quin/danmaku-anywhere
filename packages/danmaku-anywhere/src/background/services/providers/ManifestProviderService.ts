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
import type { ILogger } from '@/common/Logger'
import { computeNamespaceKey } from '@/common/providers/namespaceKey'
import { findEpisodeByNumber } from './common/findEpisodeByNumber'
import type {
  IDanmakuProvider,
  OmitSeasonId,
  ParseUrlResult,
  SeasonSearchParams,
} from './IDanmakuProvider'
import type { ManifestRegistry } from './ManifestRegistry'
import { resolveManifestInputs } from './manifestInputs'

// Manifest output shapes: the canonical fields a search/episodes/danmaku
// pipeline must emit. The host adds `manifestId` / `namespaceKey` /
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

// One malformed comment must not cost the user the rest of the episode, so
// bad entries are dropped rather than rejecting the batch. Mirrors the
// renderer, which drops comments it can't parse instead of throwing.
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

  // Derived from the runner because the manifest declares which config fields
  // identify an instance (identityFields).
  private namespaceKeyFor(runner: ManifestRunner): string {
    return computeNamespaceKey(
      {
        id: this.config.providerConfigId,
        manifestId: this.config.manifestId,
        configValues: this.config.configValues,
      },
      runner.manifest.identityFields
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
      manifestId: this.config.manifestId,
      namespaceKey: this.namespaceKeyFor(runner),
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
      manifestId: this.config.manifestId,
      namespaceKey: this.namespaceKeyFor(runner),
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
      this.config.manifestId,
      meta.providerIds
    )
    const runner = this.registry.getRunner(this.config.manifestId)
    // meta.params holds per-episode hints stashed at search/episodes time
    // (e.g. chConvert/withRelated). providerIds take precedence on key collision.
    const inputs = this.resolveInputs(runner, {
      ...meta.params,
      ...meta.providerIds,
    })
    const output = await runner.runDanmaku<unknown>(inputs, DANMAKU_RUN_OPTIONS)
    if (!Array.isArray(output)) {
      throw new Error(
        `Danmaku output from manifest ${this.config.manifestId} is not an array, got ${describeType(output)}`
      )
    }
    const { comments, dropped, firstIssue } = parseComments(output)
    if (dropped > 0) {
      this.logger.warn(
        `Dropped ${dropped} malformed comment(s) from manifest ${this.config.manifestId}, first: ${firstIssue}`
      )
    }
    // Rows in but nothing usable out means the pipeline itself is wrong, not
    // an episode that happens to have no danmaku.
    if (comments.length === 0 && output.length > 0) {
      throw new Error(
        `Every comment from manifest ${this.config.manifestId} was malformed, first: ${firstIssue}`
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
        manifestId: this.config.manifestId,
        namespaceKey: this.namespaceKeyFor(runner),
        schemaVersion: SEASON_SCHEMA_VERSION,
      },
      episodeMeta: {
        ...result.episodeMeta,
        title: stripHtml(result.episodeMeta.title),
        schemaVersion: EPISODE_SCHEMA_VERSION,
        lastChecked: now,
      },
    }
  }
}
