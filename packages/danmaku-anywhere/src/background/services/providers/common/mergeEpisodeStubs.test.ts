import type { EpisodeStub } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import { findNextStub } from './findNextStub'
import { mergeEpisodeStubs } from './mergeEpisodeStubs'

/**
 * A bookmark refresh keeps what it has: a list at least as long as the stored
 * one replaces it, a shorter one is merged into it by indexedId so the next
 * episode is still found where it was.
 */

const stub = (indexedId: string, title = `ep ${indexedId}`): EpisodeStub => ({
  providerIds: {},
  title,
  indexedId,
})

describe('mergeEpisodeStubs', () => {
  it('replaces the stored list with one at least as long', () => {
    const fresh = [stub('a'), stub('b'), stub('c')]

    expect(mergeEpisodeStubs([stub('a'), stub('b')], fresh)).toBe(fresh)
  })

  it('keeps stored stubs a shorter refresh is missing and updates the rest', () => {
    const merged = mergeEpisodeStubs(
      [stub('a'), stub('b'), stub('c')],
      [stub('a', 'renamed'), stub('c')]
    )

    expect(merged).toEqual([stub('a', 'renamed'), stub('b'), stub('c')])
  })

  it('appends episodes only the shorter refresh has', () => {
    const merged = mergeEpisodeStubs(
      [stub('a'), stub('b'), stub('c')],
      [stub('a'), stub('d')]
    )

    expect(merged.map((s) => s.indexedId)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('still finds the next episode after a refresh that lost one', () => {
    const merged = mergeEpisodeStubs(
      [stub('a'), stub('b'), stub('c')],
      [stub('a'), stub('c')]
    )

    expect(findNextStub(merged, { indexedId: 'a' })?.indexedId).toBe('b')
  })
})
