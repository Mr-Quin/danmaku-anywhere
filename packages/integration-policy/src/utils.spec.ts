import { describe, expect, it } from 'vitest'
import { deserializeIntegration, serializeIntegration } from './utils.js'

/**
 * Verifies that deserializeIntegration round-trips a current (v4) policy
 * unchanged AND transparently lifts a stored v3 policy to v4 so existing
 * backend rows survive the schema bump.
 */

describe('deserializeIntegration', () => {
  it('round-trips a v4 policy', () => {
    const v4Policy = {
      version: 4 as const,
      title: {
        selector: [{ value: 's1', quick: false }],
        regex: [],
      },
      episode: { selector: [], regex: [] },
      season: { selector: [], regex: [] },
      episodeTitle: { selector: [], regex: [] },
      options: {
        autoAdvanceOnEnded: false,
        skipPercentage: 0,
        minVideoDuration: 30,
      },
    }

    const result = deserializeIntegration(serializeIntegration(v4Policy))

    expect(result).toEqual(v4Policy)
  })

  it('migrates a stored v3 policy to v4 on read', () => {
    const v3Json = JSON.stringify({
      version: 3,
      title: { selector: [{ value: 's1', quick: false }], regex: [] },
      episode: { selector: [], regex: [] },
      season: { selector: [], regex: [] },
      episodeTitle: { selector: [], regex: [] },
      options: {},
    })

    const result = deserializeIntegration(v3Json)

    expect(result.version).toBe(4)
    expect(result.options).toEqual({
      autoAdvanceOnEnded: false,
      skipPercentage: 0,
      minVideoDuration: 30,
    })
    expect(result.nextEpisode).toBeUndefined()
    expect(result.prevEpisode).toBeUndefined()
  })

  it('fills in missing option fields when stored data omits them', () => {
    const partialJson = JSON.stringify({
      version: 4,
      title: { selector: [{ value: 's1', quick: false }], regex: [] },
      episode: { selector: [], regex: [] },
      season: { selector: [], regex: [] },
      episodeTitle: { selector: [], regex: [] },
      options: { autoAdvanceOnEnded: true },
    })

    const result = deserializeIntegration(partialJson)

    expect(result.options).toEqual({
      autoAdvanceOnEnded: true,
      skipPercentage: 0,
      minVideoDuration: 30,
    })
  })
})
