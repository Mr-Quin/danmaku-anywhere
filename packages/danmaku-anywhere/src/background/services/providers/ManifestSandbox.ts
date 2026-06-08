import { ManifestRunner, type RunOptions, zManifest } from '@mr-quin/dango'
import { injectable } from 'inversify'
import type {
  ManifestTestDanmakuInput,
  ManifestTestEpisodeRow,
  ManifestTestEpisodesInput,
  ManifestTestSearchInput,
  ManifestTestSearchRow,
  ManifestValidationResult,
} from '@/common/rpcClient/background/types'
import { extensionFetchLike } from './extensionFetchLike'
import { resolveManifestInputs } from './manifestInputs'

// An ad-hoc test run executes an unsaved, user-authored manifest: arbitrary
// JSONata plus credentialed fetch under the extension's host permissions.
// Withhold the private-host opt-in so the engine's host-rejection boundary
// applies. Saving a manifest is a separate trust decision on the normal
// provider path, which keeps its own run options.
export const TEST_RUN_OPTIONS: RunOptions = {}

// A danmaku run fans out across segments; tolerate a failed segment so one
// missing segment doesn't drop the whole preview, mirroring production.
export const TEST_DANMAKU_RUN_OPTIONS: RunOptions = { continueOnError: true }

// Executes a not-yet-saved manifest so the editor can preview it. Stateless:
// every call rebuilds the runner from the posted manifest and touches no store.
@injectable('Singleton')
export class ManifestSandbox {
  validate(manifest: unknown): ManifestValidationResult {
    const parsed = zManifest.safeParse(manifest)
    if (parsed.success) {
      return { valid: true }
    }
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    }
  }

  async search(
    input: ManifestTestSearchInput
  ): Promise<ManifestTestSearchRow[]> {
    const runner = this.buildRunner(input.manifest)
    const inputs = resolveManifestInputs(runner.configDefaults(), undefined, {
      q: input.keyword,
    })
    return runner.runSearch<ManifestTestSearchRow[]>(inputs, TEST_RUN_OPTIONS)
  }

  async episodes(
    input: ManifestTestEpisodesInput
  ): Promise<ManifestTestEpisodeRow[]> {
    const runner = this.buildRunner(input.manifest)
    const inputs = resolveManifestInputs(
      runner.configDefaults(),
      input.configValues,
      input.providerIds
    )
    return runner.runEpisodes<ManifestTestEpisodeRow[]>(
      inputs,
      TEST_RUN_OPTIONS
    )
  }

  async danmaku(
    input: ManifestTestDanmakuInput
  ): Promise<{ commentCount: number }> {
    const runner = this.buildRunner(input.manifest)
    const inputs = resolveManifestInputs(
      runner.configDefaults(),
      input.configValues,
      { ...input.params, ...input.providerIds }
    )
    const comments = await runner.runDanmaku<unknown[]>(
      inputs,
      TEST_DANMAKU_RUN_OPTIONS
    )
    return { commentCount: comments.length }
  }

  private buildRunner(manifest: unknown): ManifestRunner {
    const parsed = zManifest.safeParse(manifest)
    if (!parsed.success) {
      throw new Error('Cannot run an invalid manifest')
    }
    try {
      return new ManifestRunner(parsed.data, { fetcher: extensionFetchLike })
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      throw new Error(`Failed to build manifest runner: ${reason}`)
    }
  }
}
