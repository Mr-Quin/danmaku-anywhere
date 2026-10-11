import { describe, expect, it } from 'vitest'
import { zCombinedPolicy } from '@/common/options/combinedPolicy'
import { createMountConfig } from '@/common/options/mountConfig/constant'

/**
 * Exported config backups from older versions embed a v3 integration. The
 * import schema must lift them rather than silently rejecting the whole entry.
 */

const v3Integration = {
  version: 3,
  id: '11111111-1111-4111-8111-111111111111',
  name: 'legacy',
  policy: {
    version: 3,
    title: { selector: [{ value: '//h1', quick: false }], regex: [] },
    episode: { selector: [], regex: [] },
    season: { selector: [], regex: [] },
    episodeTitle: { selector: [], regex: [] },
    options: {},
  },
}

describe('zCombinedPolicy', () => {
  it('lifts a v3 integration from an exported backup', async () => {
    const result = await zCombinedPolicy.safeParseAsync({
      ...createMountConfig({
        name: 'legacy',
        patterns: ['https://example.com/*'],
        mode: 'xpath',
      }),
      integration: v3Integration,
    })

    expect(result.success).toBe(true)
    expect(result.data?.integration?.version).toBe(4)
    expect(result.data?.integration?.policy.options).toEqual({
      autoAdvanceOnEnded: false,
      skipPercentage: 0,
      minVideoDuration: 30,
    })
  })

  it('accepts a current integration unchanged', async () => {
    const current = {
      ...v3Integration,
      version: 4,
      policy: {
        ...v3Integration.policy,
        version: 4,
        options: {
          autoAdvanceOnEnded: true,
          skipPercentage: 0,
          minVideoDuration: 30,
        },
      },
    }

    const result = await zCombinedPolicy.safeParseAsync({
      ...createMountConfig({
        name: 'current',
        patterns: ['https://example.com/*'],
        mode: 'xpath',
      }),
      integration: current,
    })

    expect(result.success).toBe(true)
    expect(result.data?.integration?.policy.options.autoAdvanceOnEnded).toBe(
      true
    )
  })
})
