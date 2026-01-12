import { describe, expect, it } from 'vitest'
import { SeasonMap } from './SeasonMap'

describe('SeasonMap', () => {
  it('serializes mappings created from a season', () => {
    const map = SeasonMap.fromSeason('media-key', {
      providerConfigId: 'ddp',
      id: 10,
    })

    expect(map.toSnapshot()).toEqual({
      key: 'media-key',
      seasons: {
        ddp: 10,
      },
      seasonIds: [10],
    })
  })

  it('merges mappings without duplicating season ids', () => {
    const base = SeasonMap.fromSnapshot({
      key: 'media-key',
      seasons: {
        ddp: 10,
      },
      seasonIds: [10],
    })

    const merged = base.merge(
      SeasonMap.fromSnapshot({
        key: 'media-key',
        seasons: {
          bilibili: 42,
          tencent: 42,
        },
        seasonIds: [42],
      })
    )

    expect(merged.seasons).toEqual({
      ddp: 10,
      bilibili: 42,
      tencent: 42,
    })
    expect(merged.seasonIds.toSorted()).toEqual([10, 42])

    const pruned = merged.withoutSeasonId(42)
    expect(pruned.seasonIds.toSorted()).toEqual([10])
    expect(pruned.seasons).toEqual({
      ddp: 10,
    })
  })

  it('checks mappings inside a collection', () => {
    const list = SeasonMap.reviveAll([
      {
        key: 'media-key',
        seasons: { ddp: 10 },
        seasonIds: [10],
      },
      {
        key: 'other',
        seasons: { ddp: 20 },
        seasonIds: [20],
      },
    ])

    expect(SeasonMap.hasMapping(list, 'media-key', 'ddp', 10)).toBe(true)
    expect(SeasonMap.hasMapping(list, 'media-key', 'ddp', 11)).toBe(false)
    expect(SeasonMap.hasMapping(list, 'unknown', 'ddp', 10)).toBe(false)
  })
})
