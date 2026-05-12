import type { Manifest, VariantPipeline } from '../manifest/schema.js'
import type { FetchLike } from './http.js'
import { ProtoRegistry } from './proto.js'
import { type RunOptions, runPipeline } from './runner.js'

/**
 * Per-instance options bound at construction. Override per-call by passing
 * them again to `runSearch` / `runEpisodes` / `runDanmaku`.
 */
export interface ManifestRunnerOptions {
  /** Override the default global fetch. Required for non-browser hosts. */
  fetcher?: FetchLike
  /** Cancellation signal applied to every pipeline run, unless overridden per-call. */
  signal?: AbortSignal
}

/**
 * Per-call inputs. Combines per-call values (q, providerIds) with per-installation
 * config values that flow into the pipeline context. The host is responsible
 * for merging config storage into this bag before invoking.
 */
export type ManifestInputs = Record<string, unknown>

/**
 * Public API entry point. Wraps a parsed manifest with bound options;
 * exposes one method per pipeline kind. Variant selection happens internally.
 *
 * Typical use:
 *
 * ```ts
 * const manifest = zManifest.parse(manifestJson)
 * const runner = new ManifestRunner(manifest, { fetcher: extensionFetcher })
 * const seasons = await runner.runSearch({ q: 'frieren', baseUrl: '...' })
 * ```
 */
export class ManifestRunner {
  private readonly protoRegistry: ProtoRegistry

  constructor(
    public readonly manifest: Manifest,
    private readonly options: ManifestRunnerOptions = {}
  ) {
    this.protoRegistry = new ProtoRegistry(manifest.protoSchemas)
  }

  /** Stable id of the source — matches `providerConfigId` in stored records. */
  get id(): string {
    return this.manifest.id
  }

  /** Display name. */
  get name(): string {
    return this.manifest.name
  }

  /** Whether this manifest can perform searches. */
  hasSearch(): boolean {
    return this.manifest.search !== undefined
  }

  /** Whether this manifest can list episodes for a season. */
  hasEpisodes(): boolean {
    return this.manifest.episodes !== undefined
  }

  /** Whether this manifest can fetch danmaku for an episode. */
  hasDanmaku(): boolean {
    return this.manifest.danmaku !== undefined
  }

  /** Run the search pipeline. Errors if the manifest declares no `search`. */
  async runSearch(inputs: ManifestInputs, opts?: RunOptions): Promise<unknown> {
    return this.run('search', this.manifest.search, inputs, opts)
  }

  /** Run the episodes pipeline. Errors if the manifest declares no `episodes`. */
  async runEpisodes(
    inputs: ManifestInputs,
    opts?: RunOptions
  ): Promise<unknown> {
    return this.run('episodes', this.manifest.episodes, inputs, opts)
  }

  /** Run the danmaku pipeline. Errors if the manifest declares no `danmaku`. */
  async runDanmaku(
    inputs: ManifestInputs,
    opts?: RunOptions
  ): Promise<unknown> {
    return this.run('danmaku', this.manifest.danmaku, inputs, opts)
  }

  private async run(
    name: string,
    variants: VariantPipeline[] | undefined,
    inputs: ManifestInputs,
    opts?: RunOptions
  ): Promise<unknown> {
    if (variants === undefined) {
      throw new Error(
        `manifest "${this.manifest.id}" does not declare a ${name} pipeline`
      )
    }
    const merged: RunOptions = {
      fetcher: opts?.fetcher ?? this.options.fetcher,
      signal: opts?.signal ?? this.options.signal,
      maxResponseBytes: opts?.maxResponseBytes,
      maxForEachIterations: opts?.maxForEachIterations,
      protoRegistry: opts?.protoRegistry ?? this.protoRegistry,
    }
    return runPipeline(this.manifest, variants, inputs, merged)
  }
}
