import { describe, expect, it } from 'vitest'
import { getRandomUUID } from '../uuid.js'
import type { IntegrationV2 } from './v2.js'
import { migrateV2ToV3, zIntegrationV3 } from './v3.js'

describe('v3 migration', () => {
  it('should migrate v2 to v3', () => {
    const id = getRandomUUID()

    const v2: IntegrationV2 = {
      name: 'test',
      id,
      policy: {
        title: { selector: [{ value: 's1', quick: false }], regex: [] },
        episode: { selector: [], regex: [] },
        season: { selector: [], regex: [] },
        episodeTitle: { selector: [], regex: [] },
        options: {
          titleOnly: true,
          dandanplay: { useMatchApi: false },
          useAI: true,
        },
      },
    }

    const v3 = migrateV2ToV3([v2])[0]

    expect(v3).toEqual({
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
    })

    expect(zIntegrationV3.parse(v3)).toEqual(v3)
  })
})
