import { ManifestRunner } from '@mr-quin/dango'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ManifestSandbox,
  TEST_DANMAKU_RUN_OPTIONS,
  TEST_RUN_OPTIONS,
} from './ManifestSandbox'

/**
 * ManifestSandbox previews an unsaved manifest. Covers validation surfacing,
 * the input precedence (defaults < config values < per-call), and the trust
 * boundary: every ad-hoc run withholds `allowPrivateHosts` so the engine's
 * host-rejection applies, and an invalid manifest never reaches the runner.
 */

function makeManifest(id = 'mine:one'): Record<string, unknown> {
  return {
    apiVersion: 1,
    id,
    name: id,
    version: '1.0.0',
    hosts: ['example.com'],
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ManifestSandbox.validate', () => {
  it('accepts a well-formed manifest', () => {
    expect(new ManifestSandbox().validate(makeManifest())).toEqual({
      valid: true,
    })
  })

  it('reports issues with a path and message for an invalid manifest', () => {
    const result = new ManifestSandbox().validate({ id: 'x' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues[0]).toHaveProperty('message')
    }
  })
})

describe('ManifestSandbox test runs', () => {
  it('searches with the keyword and withholds allowPrivateHosts', async () => {
    const runSearch = vi
      .spyOn(ManifestRunner.prototype, 'runSearch')
      .mockResolvedValue([])
    vi.spyOn(ManifestRunner.prototype, 'configDefaults').mockReturnValue({})

    await new ManifestSandbox().search({
      manifest: makeManifest(),
      keyword: 'frieren',
    })

    expect(runSearch).toHaveBeenCalledWith({ q: 'frieren' }, TEST_RUN_OPTIONS)
    expect(TEST_RUN_OPTIONS).not.toHaveProperty('allowPrivateHosts')
  })

  it('merges defaults, config values, and the chosen season ids for episodes', async () => {
    const runEpisodes = vi
      .spyOn(ManifestRunner.prototype, 'runEpisodes')
      .mockResolvedValue([])
    vi.spyOn(ManifestRunner.prototype, 'configDefaults').mockReturnValue({
      baseUrl: 'default',
      extra: 'kept',
    })

    await new ManifestSandbox().episodes({
      manifest: makeManifest(),
      configValues: { baseUrl: 'override', dropped: undefined },
      providerIds: { seasonId: 7 },
    })

    expect(runEpisodes).toHaveBeenCalledWith(
      { baseUrl: 'override', extra: 'kept', seasonId: 7 },
      TEST_RUN_OPTIONS
    )
  })

  it('counts danmaku, threads params under providerIds, and tolerates a failed segment', async () => {
    const runDanmaku = vi
      .spyOn(ManifestRunner.prototype, 'runDanmaku')
      .mockResolvedValue([{}, {}, {}])
    vi.spyOn(ManifestRunner.prototype, 'configDefaults').mockReturnValue({})

    const result = await new ManifestSandbox().danmaku({
      manifest: makeManifest(),
      providerIds: { cid: 9 },
      params: { chConvert: 1, cid: 'stale' },
    })

    expect(result).toEqual({ commentCount: 3 })
    expect(runDanmaku).toHaveBeenCalledWith(
      { chConvert: 1, cid: 9 },
      TEST_DANMAKU_RUN_OPTIONS
    )
    expect(TEST_DANMAKU_RUN_OPTIONS.continueOnError).toBe(true)
    expect(TEST_DANMAKU_RUN_OPTIONS).not.toHaveProperty('allowPrivateHosts')
  })

  it('rejects an invalid manifest before reaching the runner', async () => {
    const runSearch = vi.spyOn(ManifestRunner.prototype, 'runSearch')

    await expect(
      new ManifestSandbox().search({ manifest: { id: 'x' }, keyword: 'y' })
    ).rejects.toThrow(/invalid/i)
    expect(runSearch).not.toHaveBeenCalled()
  })
})
