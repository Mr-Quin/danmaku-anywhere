import { describe, expect, it } from 'vitest'
import { getRandomUUID } from '../uuid.js'
import type { IntegrationV3 } from './v3.js'
import { migrateV3ToV4, zIntegrationV4 } from './v4.js'

/**
 * Verifies v3 -> v4 migration: version bump, options.autoAdvanceOnEnded
 * being initialised to false, and that nextEpisode/prevEpisode remain
 * absent. Also verifies the v4 schema accepts the click-mode navigation
 * shape and a fully-populated options object.
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
        },
      },
    })

    expect(zIntegrationV4.parse(v4)).toEqual(v4)
  })

  it('should accept click-mode navigation entries on the policy', () => {
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
        nextEpisode: {
          mode: 'click',
          selectors: [{ value: '//button[@id="next"]', quick: false }],
        },
        prevEpisode: {
          mode: 'click',
          selectors: [{ value: '//button[@id="prev"]', quick: false }],
        },
        options: { autoAdvanceOnEnded: true },
      },
    })

    expect(parsed.policy.options.autoAdvanceOnEnded).toBe(true)
    expect(parsed.policy.nextEpisode).toEqual({
      mode: 'click',
      selectors: [{ value: '//button[@id="next"]', quick: false }],
    })
  })
})
