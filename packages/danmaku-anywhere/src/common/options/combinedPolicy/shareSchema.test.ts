import { describe, expect, it } from 'vitest'
import {
  decodeShareConfig,
  encodeShareConfig,
} from '@/common/options/combinedPolicy/shareSchema'

/**
 * Share codes and exported configs minted by older extension versions carry a
 * v3 policy. Both decode paths must lift them to the current schema instead of
 * rejecting them.
 */

const v3Policy = {
  version: 3,
  title: { selector: [{ value: '//h1', quick: false }], regex: [] },
  episode: { selector: [], regex: [] },
  season: { selector: [], regex: [] },
  episodeTitle: { selector: [], regex: [] },
}

const v4Policy = {
  version: 4 as const,
  title: { selector: [{ value: '//h1', quick: false }], regex: [] },
  episode: { selector: [], regex: [] },
  season: { selector: [], regex: [] },
  episodeTitle: { selector: [], regex: [] },
}

describe('decodeShareConfig', () => {
  it('round-trips a current share code', async () => {
    const code = await encodeShareConfig({
      name: 'current',
      patterns: ['https://example.com/*'],
      policy: v4Policy,
    })

    const decoded = await decodeShareConfig(code)

    expect(decoded.policy).toEqual(v4Policy)
  })

  it('lifts a v3 share code to the current version', async () => {
    const code = await encodeShareConfig({
      name: 'legacy',
      patterns: ['https://example.com/*'],
      policy: v3Policy as never,
    })

    const decoded = await decodeShareConfig(code)

    expect(decoded.policy.version).toBe(4)
    expect(decoded.policy.title.selector).toEqual([
      { value: '//h1', quick: false },
    ])
  })

  it('rejects a share code whose policy is not a known version', async () => {
    const code = await encodeShareConfig({
      name: 'future',
      patterns: [],
      policy: { ...v3Policy, version: 99 } as never,
    })

    await expect(decodeShareConfig(code)).rejects.toThrow()
  })
})
