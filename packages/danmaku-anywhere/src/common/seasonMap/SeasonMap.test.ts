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
      local: undefined,
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

  it('removes a specific provider mapping', () => {
    const map = SeasonMap.fromSnapshot({
      key: 'media-key',
      seasons: {
        ddp: 10,
        bilibili: 42,
      },
      seasonIds: [10, 42],
    })

    const pruned = map.withoutProvider('ddp')
    expect(pruned.seasons).toEqual({
      bilibili: 42,
    })
    expect(pruned.getSeasonId('ddp')).toBeUndefined()

    const empty = pruned.withoutProvider('bilibili')
    expect(empty.seasons).toEqual({})
  })

  describe('local field', () => {
    it('withLocal returns new instance with local set', () => {
      const map = SeasonMap.empty('test')
      const updated = map.withLocal('anime/show')
      expect(updated.local).toBe('anime/show')
      expect(map.local).toBeUndefined()
    })

    it('withoutLocal returns new instance with local cleared', () => {
      const map = SeasonMap.empty('test').withLocal('anime/show')
      const cleared = map.withoutLocal()
      expect(cleared.local).toBeUndefined()
      expect(map.local).toBe('anime/show')
    })

    it('toSnapshot includes local field', () => {
      const map = SeasonMap.empty('test').withLocal('anime/show')
      const snapshot = map.toSnapshot()
      expect(snapshot.local).toBe('anime/show')
    })

    it('toSnapshot omits local when undefined', () => {
      const map = SeasonMap.empty('test')
      const snapshot = map.toSnapshot()
      expect(snapshot.local).toBeUndefined()
    })

    it('fromSnapshot reads local field', () => {
      const map = SeasonMap.fromSnapshot({
        key: 'test',
        seasons: {},
        seasonIds: [],
        local: 'anime/show',
      })
      expect(map.local).toBe('anime/show')
    })

    it('merge prefers incoming local over self', () => {
      const a = SeasonMap.empty('test').withLocal('folder-a')
      const b = SeasonMap.empty('test').withLocal('folder-b')
      const merged = a.merge(b)
      expect(merged.local).toBe('folder-b')
    })

    it('merge takes local from other when self has none', () => {
      const a = SeasonMap.empty('test')
      const b = SeasonMap.empty('test').withLocal('folder-b')
      const merged = a.merge(b)
      expect(merged.local).toBe('folder-b')
    })

    it('merge preserves self.local when other has none (additive)', () => {
      const a = SeasonMap.empty('test').withLocal('folder-a')
      const b = SeasonMap.empty('test').withMapping('provider1', 42)
      const merged = a.merge(b)
      expect(merged.local).toBe('folder-a')
      expect(merged.getSeasonId('provider1')).toBe(42)
    })

    it('withLocal preserves existing season mappings', () => {
      const map = SeasonMap.empty('test')
        .withMapping('provider1', 42)
        .withLocal('anime/show')
      expect(map.getSeasonId('provider1')).toBe(42)
      expect(map.local).toBe('anime/show')
    })
  })
})
