import { describe, expect, it } from 'vitest'
import type { PipelineEntry } from '@/common/rpcClient/background/types'
import { panelEntriesEqual } from './panelEntryEqual'

/**
 * Exercises the equality predicate used to deduplicate panel-state broadcasts.
 * Covers cases where equal entries skip a broadcast and distinct entries
 * (different substate, commentCount, provider, or media) trigger one.
 */

function makeEntry(over: Partial<PipelineEntry> = {}): PipelineEntry {
  return { source: 'pipeline', substate: 'noMatch', ...over }
}

describe('panelEntriesEqual', () => {
  it('returns true for the same object reference', () => {
    const entry = makeEntry()
    expect(panelEntriesEqual(entry, entry)).toBe(true)
  })

  it('returns true for equal objects with no optional fields', () => {
    expect(panelEntriesEqual(makeEntry(), makeEntry())).toBe(true)
  })

  it('returns true for equal objects with matching media and commentCount', () => {
    const a = makeEntry({
      substate: 'mounted',
      commentCount: 42,
      media: { title: 'Show', episode: 3, episodeTitle: 'Ep' },
    })
    const b = makeEntry({
      substate: 'mounted',
      commentCount: 42,
      media: { title: 'Show', episode: 3, episodeTitle: 'Ep' },
    })
    expect(panelEntriesEqual(a, b)).toBe(true)
  })

  it('returns false when substate differs', () => {
    expect(
      panelEntriesEqual(
        makeEntry({ substate: 'loading' }),
        makeEntry({ substate: 'noMatch' })
      )
    ).toBe(false)
  })

  it('returns false when commentCount differs', () => {
    expect(
      panelEntriesEqual(
        makeEntry({ substate: 'mounted', commentCount: 10 }),
        makeEntry({ substate: 'mounted', commentCount: 11 })
      )
    ).toBe(false)
  })

  it('returns false when one has commentCount and the other does not', () => {
    expect(
      panelEntriesEqual(
        makeEntry({ substate: 'mounted', commentCount: 0 }),
        makeEntry({ substate: 'mounted' })
      )
    ).toBe(false)
  })

  it('returns false when provider differs', () => {
    expect(
      panelEntriesEqual(
        makeEntry({ provider: 'bilibili' as PipelineEntry['provider'] }),
        makeEntry({ provider: 'dandanplay' as PipelineEntry['provider'] })
      )
    ).toBe(false)
  })

  it('returns false when media is present in one but absent in the other', () => {
    expect(
      panelEntriesEqual(makeEntry({ media: { title: 'Show' } }), makeEntry())
    ).toBe(false)
  })

  it('returns false when media title differs', () => {
    expect(
      panelEntriesEqual(
        makeEntry({ media: { title: 'A' } }),
        makeEntry({ media: { title: 'B' } })
      )
    ).toBe(false)
  })

  it('returns false when media episode differs', () => {
    expect(
      panelEntriesEqual(
        makeEntry({ media: { title: 'S', episode: 1 } }),
        makeEntry({ media: { title: 'S', episode: 2 } })
      )
    ).toBe(false)
  })

  it('returns false when media seasonDecorator differs', () => {
    expect(
      panelEntriesEqual(
        makeEntry({ media: { title: 'S', seasonDecorator: '1' } }),
        makeEntry({ media: { title: 'S', seasonDecorator: '2' } })
      )
    ).toBe(false)
  })

  it('returns false when media originalTitle differs', () => {
    expect(
      panelEntriesEqual(
        makeEntry({ media: { title: 'S', originalTitle: 'A' } }),
        makeEntry({ media: { title: 'S', originalTitle: 'B' } })
      )
    ).toBe(false)
  })
})
