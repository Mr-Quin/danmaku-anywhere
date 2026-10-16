import type { EpisodeMeta } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import type { OmitSeasonId } from '../IDanmakuProvider'
import { findEpisodeByNumber } from './findEpisodeByNumber'

/**
 * findEpisodeByNumber picks an episode by its episodeNumber, or by a number in
 * its title when it has none.
 */

function episode(
  overrides: Partial<OmitSeasonId<EpisodeMeta>>
): OmitSeasonId<EpisodeMeta> {
  return {
    indexedId: '1',
    title: 'Episode',
    providerIds: {},
    schemaVersion: 4,
    lastChecked: 0,
    ...overrides,
  } as OmitSeasonId<EpisodeMeta> // lint-specs-allow-cast: only the fields findEpisodeByNumber reads matter here
}

describe('findEpisodeByNumber', () => {
  it('matches an episodeNumber stored as text', () => {
    const third = episode({ indexedId: '3', episodeNumber: '3' })

    expect(findEpisodeByNumber([episode({}), third], 3)).toBe(third)
  })

  it('falls back to the title for an episode whose number is null', () => {
    const third = episode({
      indexedId: '3',
      title: '第3集',
      episodeNumber: null as unknown as undefined, // lint-specs-allow-cast: stored data from an older build can hold null
    })

    expect(findEpisodeByNumber([third], 3)).toBe(third)
  })
})
