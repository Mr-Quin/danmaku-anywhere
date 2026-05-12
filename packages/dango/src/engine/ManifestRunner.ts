import type { Manifest, VariantPipeline } from '../manifest/schema.js'
import type { FetchLike } from './http.js'
import { ProtoRegistry } from './proto.js'
import { type RunOptions, runPipeline } from './runner.js'

/** Bound at construction; per-call overrides via the `opts` arg on each method. */
export interface ManifestRunnerOptions {
  fetcher?: FetchLike
  signal?: AbortSignal
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
    this.protoRegistry = new ProtoRegistry(manifest.protoSchemas)
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

  async runSearch(inputs: ManifestInputs, opts?: RunOptions): Promise<unknown> {
    return this.run('search', this.manifest.search, inputs, opts)
  }

  async runEpisodes(
    inputs: ManifestInputs,
    opts?: RunOptions
  ): Promise<unknown> {
    return this.run('episodes', this.manifest.episodes, inputs, opts)
  }

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
      protoRegistry: opts?.protoRegistry ?? this.protoRegistry,
    }
    return runPipeline(this.manifest, variants, inputs, merged)
  }
}
