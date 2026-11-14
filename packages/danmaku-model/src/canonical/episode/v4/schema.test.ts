import { describe, expect, it } from 'vitest'
import { zCustomEpisodeInsertV4, zEpisodeInsertV4 } from './schema.js'

/**
 * Stored episode schemas, which backup restore parses. A comment the renderer
 * skips (here bilibili's positioned mode 7) must not reject the episode.
 */

const comments = [
  { p: '1,1,16777215', m: 'scrolling' },
  { p: '2,7,16777215', m: 'positioned' },
]

describe('v4 episode schemas', () => {
  it('accept a regular episode holding an unrenderable comment', () => {
    const parsed = zEpisodeInsertV4.safeParse({
      title: 'Ep1',
      providerIds: {},
      indexedId: '1',
      seasonId: 1,
      comments,
      commentCount: comments.length,
      schemaVersion: 4,
      lastChecked: 0,
    })

    expect(parsed.success).toBe(true)
  })

  it('accept a custom episode holding an unrenderable comment', () => {
    const parsed = zCustomEpisodeInsertV4.safeParse({
      title: 'Local',
      comments,
      commentCount: comments.length,
      schemaVersion: 4,
    })

    expect(parsed.success).toBe(true)
  })
})
