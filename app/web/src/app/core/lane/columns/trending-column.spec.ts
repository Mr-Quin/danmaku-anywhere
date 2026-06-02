import { TestBed } from '@angular/core/testing'

import { LaneStore } from '../lane.store'
import { TrendingColumn } from './trending-column'

/**
 * Verifies the trending wrapper is the only place that translates the feature
 * body's intents into LaneStore ops: openDetails opens a deduped show column,
 * and openWatch opens a kazumi search column seeded with the show title (a
 * bangumi subject has no direct source). The body stays store-free; only the
 * wrapper touches the store.
 */
describe('TrendingColumn', () => {
  function createWrapper() {
    TestBed.configureTestingModule({})
    const store = TestBed.inject(LaneStore)
    const wrapper = TestBed.runInInjectionContext(() => new TrendingColumn())
    return { store, wrapper }
  }

  it('openDetails maps to a deduped show column', () => {
    const { store, wrapper } = createWrapper()
    const before = store.columns().length
    wrapper.onOpenDetails({ id: 42, altTitle: 'Alt', title: 'Title' })
    const cols = store.columns()
    expect(cols.length).toBe(before + 1)
    const opened = cols[cols.length - 1]
    expect(opened.kind).toBe('show')
    if (opened.kind === 'show') {
      expect(opened.subjectId).toBe(42)
    }
  })

  it('openDetails falls back to altTitle when title is missing', () => {
    const { store, wrapper } = createWrapper()
    wrapper.onOpenDetails({ id: 7, altTitle: 'OnlyAlt' })
    expect(store.columns().some((c) => c.kind === 'show')).toBe(true)
  })

  it('openWatch opens a kazumi search column seeded with the title', () => {
    const { store, wrapper } = createWrapper()
    wrapper.onOpenWatch({ id: 9, altTitle: 'Alt', title: 'Watch Me' })
    const opened = store.columns()[store.columns().length - 1]
    expect(opened.kind).toBe('search')
    if (opened.kind === 'search') {
      expect(opened.query).toBe('Watch Me')
    }
  })

  it('openWatch falls back to altTitle when title is missing', () => {
    const { store, wrapper } = createWrapper()
    wrapper.onOpenWatch({ id: 5, altTitle: 'OnlyAlt' })
    const opened = store.columns()[store.columns().length - 1]
    expect(opened.kind).toBe('search')
    if (opened.kind === 'search') {
      expect(opened.query).toBe('OnlyAlt')
    }
  })
})
