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
import {
  AppError,
  type ManifestPipeline,
  type SourceRef,
} from '@/common/errors/AppError'
import type { ILogger } from '@/common/Logger'
import {
  capabilitiesFromManifest,
  type SourceStatus,
} from '@/common/providers/sourceCapabilities'
import { findEpisodeByNumber } from './common/findEpisodeByNumber'
import { pickDefined } from './common/pickDefined'
import type {
  EpisodeList,
  OmitSeasonId,
  ParseUrlResult,
  SeasonSearchParams,
  SourceProvider,
} from './IDanmakuProvider'
import type { ManifestRegistry } from './ManifestRegistry'
import type { ManifestOutputSource } from './manifestErrors'
import { resolveManifestInputs } from './manifestInputs'
import {
  describeDroppedRows,
  type OutputSchema,
  type ParsedRows,
  parseOutputRows,
  parseOutputValue,
} from './manifestOutput'
import { fromDangoError } from './providerErrors'

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

// Rows are loose, so only these fields are copied onto stored entities. An
// unknown field such as `id` would otherwise reach IndexedDB as a key.
const SEASON_ROW_FIELDS = [
  'type',
  'imageUrl',
  'externalLink',
  'alternativeTitles',
  'episodeCount',
  'year',
] as const

const EPISODE_ROW_FIELDS = [
  'episodeNumber',
  'imageUrl',
  'externalLink',
  'alternativeTitle',
  'params',
] as const

function hasSeasonIdentity(output: unknown): boolean {
  if (typeof output !== 'object' || output === null) {
    return false
  }
  const seasonInsert: unknown = Reflect.get(output, 'seasonInsert')
  if (typeof seasonInsert !== 'object' || seasonInsert === null) {
    return false
  }
  const indexedId: unknown = Reflect.get(seasonInsert, 'indexedId')
  return indexedId !== undefined && indexedId !== null && indexedId !== ''
}

export class ManifestProviderService implements SourceProvider {
  constructor(
    private readonly config: ManifestProviderConfig,
    private readonly registry: ManifestRegistry,
    private readonly logger: ILogger
  ) {}

  private source(pipeline: ManifestPipeline): ManifestOutputSource {
    return {
      manifestId: this.config.source.manifestId,
      pipeline,
      source: this.config.source,
    }
  }

  private parseRows<T>(
    pipeline: ManifestPipeline,
    schema: OutputSchema<T>,
    output: unknown
  ): ParsedRows<T> {
    const source = this.source(pipeline)
    const parsed = parseOutputRows(schema, output, source, (paths) => {
      this.logRepair(pipeline, paths)
    })
    if (parsed.dropped) {
      this.logger.warn(describeDroppedRows(source, parsed.dropped))
    }
    return parsed
  }

  private parseValue<T>(
    pipeline: ManifestPipeline,
    schema: OutputSchema<T>,
    output: unknown
  ): T {
    return parseOutputValue(schema, output, this.source(pipeline), (paths) => {
      this.logRepair(pipeline, paths)
    })
  }

  private logRepair(pipeline: ManifestPipeline, paths: string[]): void {
    this.logger.warn(
      `Dropped or converted ${paths.join(', ')} in ${pipeline} output from manifest ${this.config.source.manifestId}`
    )
  }

  // Optional fields the source left out stay absent, so a refresh merged into
  // a stored season keeps what it already had.
  private toSeasonInsert(row: SearchRow): SeasonInsert {
    return {
      ...pickDefined(row, SEASON_ROW_FIELDS),
      indexedId: row.indexedId,
      title: stripHtml(row.title),
      providerIds: row.providerIds,
      manifestId: this.config.source.manifestId,
      providerConfigId: this.config.source.providerConfigId,
      schemaVersion: SEASON_SCHEMA_VERSION,
    }
  }

  private toEpisodeMeta(
    row: EpisodeRow,
    lastChecked: number
  ): OmitSeasonId<EpisodeMeta> {
    return {
      ...pickDefined(row, EPISODE_ROW_FIELDS),
      indexedId: row.indexedId,
      title: stripHtml(row.title),
      providerIds: row.providerIds,
      schemaVersion: EPISODE_SCHEMA_VERSION,
      lastChecked,
    }
  }

  private getRunner(): Promise<ManifestRunner> {
    return this.registry.getRunner(this.config.source.manifestId)
  }

  private async run<T>(pipeline: () => Promise<T>): Promise<T> {
    try {
      return await pipeline()
    } catch (e) {
      throw fromDangoError(e, this.config.source)
    }
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

  readonly kind = 'source'

  async getStatus(): Promise<SourceStatus> {
    const lookup = await this.registry.lookup(this.config.source.manifestId)
    if (lookup.status === 'unavailable') {
      return lookup
    }
    return {
      status: 'available',
      capabilities: capabilitiesFromManifest(lookup.runner.manifest),
    }
  }

  async search(params: SeasonSearchParams): Promise<SeasonInsert[]> {
    this.logger.debug(
      'Search via manifest',
      this.config.source.manifestId,
      params
    )
    const runner = await this.getRunner()
    const inputs = this.resolveInputs(runner, { q: params.keyword })
    const output = await this.run(() =>
      runner.runSearch(inputs, MANIFEST_RUN_OPTIONS)
    )
    return this.parseRows('search', zSearchRow, output).rows.map((row) =>
      this.toSeasonInsert(row)
    )
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
    const inputs = this.resolveInputs(runner, seasonRemoteIds)
    const output = await this.run(() =>
      runner.runSeason(inputs, MANIFEST_RUN_OPTIONS)
    )
    // A season pipeline yields nothing when the source no longer has the season.
    if (output === null || output === undefined) {
      return null
    }
    return this.toSeasonInsert(this.parseValue('season', zSeasonRow, output))
  }

  async getEpisodes(
    seasonRemoteIds: Season['providerIds']
  ): Promise<EpisodeList> {
    this.logger.debug(
      'Get episodes via manifest',
      this.config.source.manifestId,
      seasonRemoteIds
    )
    const runner = await this.getRunner()
    const inputs = this.resolveInputs(runner, seasonRemoteIds)
    const output = await this.run(() =>
      runner.runEpisodes(inputs, MANIFEST_RUN_OPTIONS)
    )
    const now = Date.now()
    const { rows, dropped } = this.parseRows('episodes', zEpisodeRow, output)
    return {
      episodes: rows.map((row) => this.toEpisodeMeta(row, now)),
      partial: dropped !== undefined,
    }
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
      runner.runDanmaku(inputs, DANMAKU_RUN_OPTIONS)
    )
    // Stricter than dango's zCommentRow: it also rejects comment options the
    // renderer cannot parse.
    return this.parseRows('danmaku', zCommentEntity, output).rows
  }

  async findEpisode(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null> {
    const { episodes } = await this.getEpisodes(season.providerIds)
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

  async canParse(url: string): Promise<boolean> {
    const runner = await this.getRunner()
    return runner.canParse(url)
  }

  async parseUrl(url: string): Promise<ParseUrlResult | null> {
    this.logger.debug(
      'Parse URL via manifest',
      this.config.source.manifestId,
      url
    )
    const runner = await this.getRunner()
    if (!runner.canParse(url)) {
      return null
    }
    const output = await this.run(() =>
      runner.runParseUrl(url, undefined, MANIFEST_RUN_OPTIONS)
    )
    // The link matched, so an output with no title identity means the source
    // has nothing there, such as a removed or region-locked title.
    if (!hasSeasonIdentity(output)) {
      throw new AppError(
        'source.urlTitleNotFound',
        { source: this.config.source },
        { message: `No title found for url: ${url}` }
      )
    }
    const { seasonInsert, episodeMeta } = this.parseValue(
      'parseUrl',
      zParseUrlOutput,
      output
    )
    if (episodeMeta === undefined) {
      throw new AppError(
        'source.urlEpisodeNotFound',
        {},
        { message: `Could not resolve episode for url: ${url}` }
      )
    }
    return {
      seasonInsert: this.toSeasonInsert(seasonInsert),
      episodeMeta: this.toEpisodeMeta(episodeMeta, Date.now()),
    }
  }
}
