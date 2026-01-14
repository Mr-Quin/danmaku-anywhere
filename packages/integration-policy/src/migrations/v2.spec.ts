import { describe, expect, it } from 'vitest'
import type { IntegrationV1 } from './v1.js'
import { migrateV1ToV2 } from './v2.js'

describe('v2 migration', () => {
  it('should migrate v1 to v2', () => {
    const v1: IntegrationV1 = {
      name: 'test',
      id: 'test-id',
      policy: {
        title: { selector: ['s1'], regex: ['r1'] },
        episode: { selector: ['s2'], regex: ['r2'] },
        season: { selector: ['s3'], regex: ['r3'] },
        episodeTitle: { selector: ['s4'], regex: ['r4'] },
        titleOnly: true,
      },
    }

    const v2 = migrateV1ToV2([v1])[0]

    expect(v2).toEqual({
      name: 'test',
      id: 'test-id',
      policy: {
        title: {
          selector: [{ value: 's1', quick: false }],
          regex: [{ value: 'r1', quick: false }],
        },
        episode: {
          selector: [{ value: 's2', quick: false }],
          regex: [{ value: 'r2', quick: false }],
        },
        season: {
          selector: [{ value: 's3', quick: false }],
          regex: [{ value: 'r3', quick: false }],
        },
        episodeTitle: {
          selector: [{ value: 's4', quick: false }],
          regex: [{ value: 'r4', quick: false }],
        },
        options: {
          titleOnly: true,
          dandanplay: {
            useMatchApi: false,
          },
        },
      },
    })
  })
})
