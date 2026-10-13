import type { EpisodeStub } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import { findNextStub } from './findNextStub'
import { mergeEpisodeStubs } from './mergeEpisodeStubs'

/**
 * Folding a refresh that dropped invalid rows into the stored stubs: stored
 * stubs stay in order and pick up the refreshed fields by indexedId, new
 * episodes are appended, and the next episode is still found where it was.
 */

const stub = (indexedId: string, title = `ep ${indexedId}`): EpisodeStub => ({
  providerIds: {},
  title,
  indexedId,
})

describe('mergeEpisodeStubs', () => {
  it('keeps stored stubs the refresh is missing and updates the rest', () => {
    const merged = mergeEpisodeStubs(
      [stub('a'), stub('b'), stub('c')],
      [stub('a', 'renamed'), stub('c')]
    )

    expect(merged).toEqual([stub('a', 'renamed'), stub('b'), stub('c')])
  })

  it('appends episodes only the refresh has, even when it also lost one', () => {
    const merged = mergeEpisodeStubs(
      [stub('a'), stub('b'), stub('c')],
      [stub('a'), stub('c'), stub('d'), stub('e')]
    )

    expect(merged.map((s) => s.indexedId)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('still finds the next episode after a refresh that lost one', () => {
    const merged = mergeEpisodeStubs(
      [stub('a'), stub('b'), stub('c')],
      [stub('a'), stub('c')]
    )

    expect(findNextStub(merged, { indexedId: 'a' })?.indexedId).toBe('b')
  })
})
