import { describe, expect, it } from 'vitest'
import { getRandomUUID } from '../uuid.js'
import type { IntegrationV3 } from './v3.js'
import { migrateV3ToV4, zIntegrationV4 } from './v4.js'

/**
 * Verifies v3 -> v4 migration: version bump, options defaulting to the
 * canonical {autoAdvanceOnEnded:false, skipPercentage:0, minVideoDuration:30}
 * shape, and nextEpisode/prevEpisode remaining absent. Also verifies the
 * v4 schema accepts a fully-populated options object and rejects an empty
 * navigation selector list.
 */

describe('v4 migration', () => {
  it('should migrate v3 to v4', () => {
    const id = getRandomUUID()

    const v3: IntegrationV3 = {
      version: 3,
      name: 'test',
      id,
      policy: {
        version: 3,
        title: { selector: [{ value: 's1', quick: false }], regex: [] },
        episode: { selector: [], regex: [] },
        season: { selector: [], regex: [] },
        episodeTitle: { selector: [], regex: [] },
        options: {},
      },
    }

    const v4 = migrateV3ToV4([v3])[0]

    expect(v4).toEqual({
      version: 4,
      name: 'test',
      id,
      policy: {
        version: 4,
        title: { selector: [{ value: 's1', quick: false }], regex: [] },
        episode: { selector: [], regex: [] },
        season: { selector: [], regex: [] },
        episodeTitle: { selector: [], regex: [] },
        options: {
          autoAdvanceOnEnded: false,
          skipPercentage: 0,
          minVideoDuration: 30,
        },
      },
    })

    expect(zIntegrationV4.parse(v4)).toEqual(v4)
  })

  it('should accept selector lists for navigation and the full options shape', () => {
    const id = getRandomUUID()

    const parsed = zIntegrationV4.parse({
      version: 4,
      id,
      name: 'test',
      policy: {
        version: 4,
        title: { selector: [{ value: 's1', quick: false }], regex: [] },
        episode: { selector: [], regex: [] },
        season: { selector: [], regex: [] },
        episodeTitle: { selector: [], regex: [] },
        nextEpisode: [{ value: '//button[@id="next"]', quick: false }],
        prevEpisode: [{ value: '//button[@id="prev"]', quick: false }],
        options: {
          autoAdvanceOnEnded: true,
          skipPercentage: 0.95,
          minVideoDuration: 60,
        },
      },
    })

    expect(parsed.policy.options).toEqual({
      autoAdvanceOnEnded: true,
      skipPercentage: 0.95,
      minVideoDuration: 60,
    })
    expect(parsed.policy.nextEpisode).toEqual([
      { value: '//button[@id="next"]', quick: false },
    ])
  })

  it('should reject empty selector lists for navigation', () => {
    const result = zIntegrationV4.safeParse({
      version: 4,
      id: getRandomUUID(),
      name: 'test',
      policy: {
        version: 4,
        title: { selector: [{ value: 's1', quick: false }], regex: [] },
        episode: { selector: [], regex: [] },
        season: { selector: [], regex: [] },
        episodeTitle: { selector: [], regex: [] },
        nextEpisode: [],
        options: { autoAdvanceOnEnded: false },
      },
    })

    expect(result.success).toBe(false)
  })
})
