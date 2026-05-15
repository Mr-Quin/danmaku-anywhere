import type { Manifest, VariantPipeline } from '../manifest/schema.js'
import type { FetchLike } from './http.js'
import { ProtoRegistry, type ProtoTypeOverrides } from './proto.js'
import { type RunOptions, runPipeline } from './runner.js'

/** Bound at construction; per-call overrides via the `opts` arg on each method. */
export interface ManifestRunnerOptions {
  fetcher?: FetchLike
  signal?: AbortSignal
  /** See {@link ProtoTypeOverrides}. */
  protoTypes?: ProtoTypeOverrides
}

/** Per-call inputs merged with the installation's config values by the caller. */
export type ManifestInputs = Record<string, unknown>

/**
 * Public entry point. Wraps a parsed manifest, exposes one method per pipeline
 * kind. Variant selection happens internally.
 *
 * ```ts
 * const runner = new ManifestRunner(zManifest.parse(json), { fetcher })
 * const seasons = await runner.runSearch({ q: 'frieren' })
 * ```
 */
export class ManifestRunner {
  private readonly protoRegistry: ProtoRegistry

  constructor(
    public readonly manifest: Manifest,
    private readonly options: ManifestRunnerOptions = {}
  ) {
    this.protoRegistry = new ProtoRegistry(
      manifest.protoSchemas,
      options.protoTypes
    )
  }

  get id(): string {
    return this.manifest.id
  }

  get name(): string {
    return this.manifest.name
  }

  hasSearch(): boolean {
    return this.manifest.search !== undefined
  }

  hasEpisodes(): boolean {
    return this.manifest.episodes !== undefined
  }

  hasDanmaku(): boolean {
    return this.manifest.danmaku !== undefined
  }

  /** Defaults extracted from `configSchema`; merge under user values. */
  configDefaults(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(this.manifest.configSchema)) {
      if ('default' in item && item.default !== undefined) {
        out[key] = item.default
      }
    }
    return out
  }

  async runSearch<T = unknown>(
    inputs: ManifestInputs,
    opts?: RunOptions
  ): Promise<T> {
    return this.run<T>('search', this.manifest.search, inputs, opts)
  }

  async runEpisodes<T = unknown>(
    inputs: ManifestInputs,
    opts?: RunOptions
  ): Promise<T> {
    return this.run<T>('episodes', this.manifest.episodes, inputs, opts)
  }

  async runDanmaku<T = unknown>(
    inputs: ManifestInputs,
    opts?: RunOptions
  ): Promise<T> {
    return this.run<T>('danmaku', this.manifest.danmaku, inputs, opts)
  }

  hasSeason(): boolean {
    return this.manifest.season !== undefined
  }

  async runSeason<T = unknown>(
    inputs: ManifestInputs,
    opts?: RunOptions
  ): Promise<T | null> {
    if (this.manifest.season === undefined) return null
    return this.run<T>('season', this.manifest.season, inputs, opts)
  }

  private async run<T>(
    name: string,
    variants: VariantPipeline[] | undefined,
    inputs: ManifestInputs,
    opts?: RunOptions
  ): Promise<T> {
    if (variants === undefined) {
      throw new Error(
        `manifest "${this.manifest.id}" does not declare a ${name} pipeline`
      )
    }
    const merged: RunOptions = {
      fetcher: opts?.fetcher ?? this.options.fetcher,
      signal: opts?.signal ?? this.options.signal,
      protoRegistry: opts?.protoRegistry ?? this.protoRegistry,
    }
    return runPipeline(this.manifest, variants, inputs, merged) as Promise<T>
  }
}
