import type { EpisodeStub } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import { findNextStub } from './findNextStub'

const stub = (
  indexedId: string,
  episodeNumber?: number | string,
  title = `ep ${indexedId}`
): EpisodeStub => ({
  provider: DanmakuSourceType.DanDanPlay,
  providerIds: {},
  title,
  episodeNumber,
  indexedId,
})

describe('findNextStub', () => {
  const list = [stub('a', 1), stub('b', 2), stub('c', 3)]

  it('finds the episode whose number is current + 1', () => {
    expect(findNextStub(list, stub('a', 1))?.indexedId).toBe('b')
  })

  it('matches numbers across number/string types', () => {
    const mixed = [stub('a', '1'), stub('b', 2)]
    expect(findNextStub(mixed, stub('a', 1))?.indexedId).toBe('b')
  })

  it('skips a non-sequential gap by number, not position', () => {
    const gapped = [stub('a', 1), stub('special', 99), stub('b', 2)]
    expect(findNextStub(gapped, stub('a', 1))?.indexedId).toBe('b')
  })

  it('falls back to position when numbers are non-numeric', () => {
    const named = [stub('a', 'OVA'), stub('b', 'Special')]
    expect(findNextStub(named, named[0])?.indexedId).toBe('b')
  })

  it('returns null when current is the last stub', () => {
    expect(findNextStub(list, stub('c', 3))).toBeNull()
  })

  it('returns null when current is not in the list', () => {
    expect(findNextStub(list, stub('z', 42))).toBeNull()
  })
})
