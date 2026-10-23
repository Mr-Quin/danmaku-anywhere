import { zCommentEntity } from '@danmaku-anywhere/danmaku-converter'
import {
  type FetchLike,
  loadManifest,
  ManifestRunner,
  type RunOptions,
  zEpisodeRow,
  zSearchRow,
} from '@mr-quin/dango'
import { inject, injectable } from 'inversify'
import type { ManifestPipeline } from '@/common/errors/AppError'
import { errorMessage } from '@/common/errors/errorMessage'
import type {
  ManifestTestDanmakuInput,
  ManifestTestDanmakuResult,
  ManifestTestDropped,
  ManifestTestEpisodeRow,
  ManifestTestEpisodesInput,
  ManifestTestRows,
  ManifestTestSearchInput,
  ManifestTestSearchRow,
  ManifestValidationResult,
} from '@/common/rpcClient/background/types'
import { ManifestFetcherSymbol } from './extensionFetchLike'
import { manifestRejected } from './manifestErrors'
import { resolveManifestInputs } from './manifestInputs'
import {
  type OutputSchema,
  type ParsedRows,
  parseOutputRows,
} from './manifestOutput'

// An ad-hoc test run executes an unsaved, user-authored manifest: arbitrary
// JSONata plus credentialed fetch under the extension's host permissions.
// Withhold the private-host opt-in so the engine's host-rejection boundary
// applies. Saving a manifest is a separate trust decision on the normal
// provider path, which keeps its own run options.
export const TEST_RUN_OPTIONS: RunOptions = Object.freeze({})

// A danmaku run fans out across segments; tolerate a failed segment so one
// missing segment doesn't drop the whole preview, mirroring production.
export const TEST_DANMAKU_RUN_OPTIONS: RunOptions = Object.freeze({
  continueOnError: true,
})

const NEEDS_NEWER_EXTENSION =
  'This manifest needs a newer version of the extension'

function toTestDropped(
  dropped: ParsedRows<unknown>['dropped']
): ManifestTestDropped | undefined {
  if (dropped === undefined) {
    return undefined
  }
  return { count: dropped.count, firstIssue: dropped.firstIssue }
}

// Executes a not-yet-saved manifest so the editor can preview it. Stateless:
// every call rebuilds the runner from the posted manifest and touches no store.
// Output goes through the same parsing as a saved source, so the preview
// drops and rejects exactly what the source would.
@injectable('Singleton')
export class ManifestSandbox {
  constructor(
    @inject(ManifestFetcherSymbol) private readonly fetcher: FetchLike
  ) {}

  validate(manifest: unknown): ManifestValidationResult {
    const loaded = loadManifest(manifest)
    if (loaded.status === 'ok') {
      return { valid: true }
    }
    if (loaded.status === 'incompatible') {
      return {
        valid: false,
        issues: [
          {
            path: '',
            message: NEEDS_NEWER_EXTENSION,
            needsNewerExtension: true,
          },
        ],
      }
    }
    return { valid: false, issues: loaded.issues }
  }

  async search(
    input: ManifestTestSearchInput
  ): Promise<ManifestTestRows<ManifestTestSearchRow>> {
    const runner = this.buildRunner(input.manifest)
    const inputs = resolveManifestInputs(
      runner.configDefaults(),
      input.configValues,
      { q: input.keyword }
    )
    const output = await runner.runSearch(inputs, TEST_RUN_OPTIONS)
    return this.parseRows(runner, 'search', zSearchRow, output)
  }

  async episodes(
    input: ManifestTestEpisodesInput
  ): Promise<ManifestTestRows<ManifestTestEpisodeRow>> {
    const runner = this.buildRunner(input.manifest)
    const inputs = resolveManifestInputs(
      runner.configDefaults(),
      input.configValues,
      input.providerIds
    )
    const output = await runner.runEpisodes(inputs, TEST_RUN_OPTIONS)
    return this.parseRows(runner, 'episodes', zEpisodeRow, output)
  }

  async danmaku(
    input: ManifestTestDanmakuInput
  ): Promise<ManifestTestDanmakuResult> {
    const runner = this.buildRunner(input.manifest)
    const inputs = resolveManifestInputs(
      runner.configDefaults(),
      input.configValues,
      { ...input.params, ...input.providerIds }
    )
    const output = await runner.runDanmaku(inputs, TEST_DANMAKU_RUN_OPTIONS)
    const { rows, dropped } = this.parseRows(
      runner,
      'danmaku',
      zCommentEntity,
      output
    )
    return { commentCount: rows.length, dropped }
  }

  private parseRows<T>(
    runner: ManifestRunner,
    pipeline: ManifestPipeline,
    schema: OutputSchema<T>,
    output: unknown
  ): ManifestTestRows<T> {
    const { rows, dropped } = parseOutputRows(schema, output, {
      manifestId: runner.id,
      pipeline,
    })
    return { rows, dropped: toTestDropped(dropped) }
  }

  private buildRunner(manifest: unknown): ManifestRunner {
    const loaded = loadManifest(manifest)
    if (loaded.status === 'incompatible') {
      throw manifestRejected(
        'save-needs-newer-extension',
        NEEDS_NEWER_EXTENSION
      )
    }
    if (loaded.status === 'malformed') {
      throw manifestRejected('save-invalid', 'Cannot run an invalid manifest')
    }
    try {
      return new ManifestRunner(loaded.manifest, { fetcher: this.fetcher })
    } catch (e) {
      const reason = errorMessage(e)
      throw new Error(`Failed to build manifest runner: ${reason}`)
    }
  }
}
