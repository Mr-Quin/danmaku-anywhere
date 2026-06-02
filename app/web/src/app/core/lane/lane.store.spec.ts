import { TestBed } from '@angular/core/testing'

import { DEFAULT_WIDTH } from './lane.const'
import { LaneStore } from './lane.store'

/**
 * Exercises the frozen LaneStore semantics ported from the kazumi prototype:
 * initial single-trending seed, dedupe rules for every open op, single-player
 * reuse with episode carry-over, last-column reseed on close, resize preset
 * wraparound, pin/episode/source/active/floating/tab/query mutations,
 * and the $playerColumnId / $activeColumn / $requireExtension / $disableSidebar
 * computeds. Each test injects a fresh store via providedIn: 'root' TestBed.
 */

function createStore() {
  return TestBed.inject(LaneStore)
}

describe('LaneStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({})
  })

  describe('initial state', () => {
    it('seeds a single trending column with default width', () => {
      const store = createStore()
      const cols = store.columns()
      expect(cols.length).toBe(1)
      expect(cols[0].kind).toBe('trending')
      expect(cols[0].width).toBe(DEFAULT_WIDTH.trending)
    })

    it('defaults danmaku on, no active/playing/floating', () => {
      const store = createStore()
      expect(store.danmakuOn()).toBe(true)
      expect(store.activeId()).toBe(null)
      expect(store.playing()).toBe(null)
      expect(store.floating()).toBe(false)
      expect(store.pinned()).toEqual([])
    })
  })

  describe('openApp', () => {
    it('opens a new singleton app column and returns its id', () => {
      const store = createStore()
      const id = store.openApp('calendar')
      const cols = store.columns()
      expect(cols.length).toBe(2)
      const col = cols.find((c) => c.id === id)
      expect(col?.kind).toBe('calendar')
    })

    it('dedupes singleton apps and returns the existing id', () => {
      const store = createStore()
      const first = store.openApp('search')
      const second = store.openApp('search')
      expect(second).toBe(first)
      expect(store.columns().filter((c) => c.kind === 'search').length).toBe(1)
    })
  })

  describe('openDetails', () => {
    it('opens a show column with sub and returns its id', () => {
      const store = createStore()
      const id = store.openDetails(42, 'Title')
      const col = store.columns().find((c) => c.id === id)
      expect(col?.kind).toBe('show')
      if (col?.kind === 'show') {
        expect(col.subjectId).toBe(42)
        expect(col.sub).toBe('#42')
      }
    })

    it('dedupes by subjectId', () => {
      const store = createStore()
      const first = store.openDetails(7, 'A')
      const second = store.openDetails(7, 'A')
      expect(second).toBe(first)
      expect(store.columns().filter((c) => c.kind === 'show').length).toBe(1)
    })

    it('dup=true bypasses dedupe and creates a new column', () => {
      const store = createStore()
      const first = store.openDetails(7, 'A')
      const second = store.openDetails(7, 'A', true)
      expect(second).not.toBe(first)
      expect(store.columns().filter((c) => c.kind === 'show').length).toBe(2)
    })
  })

  describe('openWatch', () => {
    it('creates the player column and sets playing', () => {
      const store = createStore()
      const id = store.openWatch({ subjectId: 1, title: 'Show', source: 'x' })
      const col = store.columns().find((c) => c.id === id)
      expect(col?.kind).toBe('player')
      const playing = store.playing()
      expect(playing?.subjectId).toBe(1)
      expect(playing?.title).toBe('Show')
      expect(playing?.episode).toBe(1)
      expect(playing?.source).toBe('x')
    })

    it('reuses the single player column on a second call and rewrites it', () => {
      const store = createStore()
      const first = store.openWatch({ subjectId: 1, title: 'Show A' })
      const second = store.openWatch({
        subjectId: 2,
        title: 'Show B',
        url: 'u',
        policyName: 'p',
      })
      expect(second).toBe(first)
      const players = store.columns().filter((c) => c.kind === 'player')
      expect(players.length).toBe(1)
      const col = players[0]
      if (col.kind === 'player') {
        expect(col.subjectId).toBe(2)
        expect(col.url).toBe('u')
        expect(col.policyName).toBe('p')
        expect(col.sub).toBe('播放中')
      }
      expect(store.playing()?.title).toBe('Show B')
    })

    it('preserves episode when re-watching the same show', () => {
      const store = createStore()
      store.openWatch({ subjectId: 5, title: 'S' })
      store.setEpisode(8)
      store.openWatch({ subjectId: 5, title: 'S' })
      expect(store.playing()?.episode).toBe(8)
    })

    it('resets episode to 1 for a different show', () => {
      const store = createStore()
      store.openWatch({ subjectId: 5, title: 'S' })
      store.setEpisode(8)
      store.openWatch({ subjectId: 6, title: 'T' })
      expect(store.playing()?.episode).toBe(1)
    })

    it('honors an explicit episode over the carry-over fallback', () => {
      const store = createStore()
      store.openWatch({ subjectId: 5, title: 'S' })
      store.setEpisode(8)
      store.openWatch({ subjectId: 5, title: 'S', episode: 3 })
      expect(store.playing()?.episode).toBe(3)
    })

    it('carries over source from the previous playing when omitted', () => {
      const store = createStore()
      store.openWatch({ subjectId: 5, title: 'S', source: 'src1' })
      store.openWatch({ subjectId: 6, title: 'T' })
      expect(store.playing()?.source).toBe('src1')
    })
  })

  describe('openComments', () => {
    it('opens a comments column and dedupes by subjectId', () => {
      const store = createStore()
      const first = store.openComments(9, 'C')
      const col = store.columns().find((c) => c.id === first)
      expect(col?.kind).toBe('comments')
      const second = store.openComments(9, 'C')
      expect(second).toBe(first)
      expect(store.columns().filter((c) => c.kind === 'comments').length).toBe(
        1
      )
    })
  })

  describe('openShowTab', () => {
    it('opens a showtab column and dedupes by subjectId + tab', () => {
      const store = createStore()
      const first = store.openShowTab(3, 'episodes')
      const col = store.columns().find((c) => c.id === first)
      expect(col?.kind).toBe('showtab')
      const same = store.openShowTab(3, 'episodes')
      expect(same).toBe(first)
      const other = store.openShowTab(3, 'characters')
      expect(other).not.toBe(first)
      expect(store.columns().filter((c) => c.kind === 'showtab').length).toBe(2)
    })
  })

  describe('close', () => {
    it('removes a column by id', () => {
      const store = createStore()
      const id = store.openApp('calendar')
      store.close(id)
      expect(store.columns().some((c) => c.id === id)).toBe(false)
    })

    it('nulls playing and floating when closing the player', () => {
      const store = createStore()
      const id = store.openWatch({ subjectId: 1, title: 'S' })
      store.setFloating(true)
      store.close(id)
      expect(store.playing()).toBe(null)
      expect(store.floating()).toBe(false)
    })

    it('reseeds a trending landing when the last column is closed', () => {
      const store = createStore()
      const seedId = store.columns()[0].id
      store.close(seedId)
      const cols = store.columns()
      expect(cols.length).toBe(1)
      expect(cols[0].kind).toBe('trending')
      expect(cols[0].id).not.toBe(seedId)
    })
  })

  describe('resize', () => {
    it('advances to the next width preset and clears full', () => {
      const store = createStore()
      const id = store.columns()[0].id
      store.toggleFull(id)
      expect(store.columns()[0].full).toBe(true)
      store.resize(id)
      expect(store.columns()[0].width).toBe(1080)
      expect(store.columns()[0].full).toBe(false)
    })

    it('wraps around to the first preset past the last', () => {
      const store = createStore()
      const id = store.columns()[0].id
      store.resize(id)
      expect(store.columns()[0].width).toBe(1080)
      store.resize(id)
      expect(store.columns()[0].width).toBe(560)
    })

    it('uses the fallback steps for kinds without an entry', () => {
      const store = createStore()
      const id = store.openApp('history')
      store.resize(id)
      const col = store.columns().find((c) => c.id === id)
      expect(col?.width).toBe(640)
    })
  })

  describe('toggleFull', () => {
    it('flips the full flag', () => {
      const store = createStore()
      const id = store.columns()[0].id
      store.toggleFull(id)
      expect(store.columns()[0].full).toBe(true)
      store.toggleFull(id)
      expect(store.columns()[0].full).toBe(false)
    })
  })

  describe('reorder', () => {
    it('moves a column from one index to another', () => {
      const store = createStore()
      const a = store.columns()[0].id
      const b = store.openApp('calendar')
      const c = store.openApp('history')
      store.reorder(0, 2)
      const ids = store.columns().map((col) => col.id)
      expect(ids).toEqual([b, c, a])
    })

    it('is a no-op when from equals to', () => {
      const store = createStore()
      store.openApp('calendar')
      const before = store.columns().map((c) => c.id)
      store.reorder(1, 1)
      expect(store.columns().map((c) => c.id)).toEqual(before)
    })
  })

  describe('togglePin / unpin', () => {
    it('toggles a pinned item on and off', () => {
      const store = createStore()
      store.togglePin({ key: 11, title: 'Pinned' })
      expect(store.pinned()).toEqual([{ key: 11, title: 'Pinned' }])
      store.togglePin({ key: 11, title: 'Pinned' })
      expect(store.pinned()).toEqual([])
    })

    it('unpin removes by key', () => {
      const store = createStore()
      store.togglePin({ key: 1, title: 'A' })
      store.togglePin({ key: 2, title: 'B' })
      store.unpin(1)
      expect(store.pinned()).toEqual([{ key: 2, title: 'B' }])
    })
  })

  describe('setEpisode / setSource', () => {
    it('updates playing only when playing is set', () => {
      const store = createStore()
      store.setEpisode(5)
      store.setSource('s')
      expect(store.playing()).toBe(null)
      store.openWatch({ subjectId: 1, title: 'S' })
      store.setEpisode(5)
      store.setSource('s2')
      expect(store.playing()?.episode).toBe(5)
      expect(store.playing()?.source).toBe('s2')
    })
  })

  describe('setActive / setFloating', () => {
    it('updates activeId and floating', () => {
      const store = createStore()
      const id = store.openApp('calendar')
      store.setActive(id)
      expect(store.activeId()).toBe(id)
      store.setFloating(true)
      expect(store.floating()).toBe(true)
    })
  })

  describe('setDetailsTab', () => {
    it('updates only the matching show column', () => {
      const store = createStore()
      const showId = store.openDetails(1, 'S')
      const otherId = store.openDetails(2, 'T')
      store.setDetailsTab(showId, 'characters')
      const show = store.columns().find((c) => c.id === showId)
      const other = store.columns().find((c) => c.id === otherId)
      if (show?.kind === 'show') {
        expect(show.tab).toBe('characters')
      }
      if (other?.kind === 'show') {
        expect(other.tab).toBeUndefined()
      }
    })

    it('does nothing for a non-show column', () => {
      const store = createStore()
      const id = store.openApp('calendar')
      store.setDetailsTab(id, 'episodes')
      const col = store.columns().find((c) => c.id === id)
      expect(col?.kind).toBe('calendar')
    })
  })

  describe('setSearchQuery', () => {
    it('updates only the matching search column', () => {
      const store = createStore()
      const id = store.openApp('search')
      store.setSearchQuery(id, 'hello')
      const col = store.columns().find((c) => c.id === id)
      if (col?.kind === 'search') {
        expect(col.query).toBe('hello')
      }
    })

    it('does nothing for a non-search column', () => {
      const store = createStore()
      const id = store.openApp('calendar')
      store.setSearchQuery(id, 'x')
      const col = store.columns().find((c) => c.id === id)
      expect(col?.kind).toBe('calendar')
    })
  })

  describe('computeds', () => {
    it('$playerColumnId tracks the single player column', () => {
      const store = createStore()
      expect(store.$playerColumnId()).toBe(null)
      const id = store.openWatch({ subjectId: 1, title: 'S' })
      expect(store.$playerColumnId()).toBe(id)
      store.close(id)
      expect(store.$playerColumnId()).toBe(null)
    })

    it('$activeColumn resolves the active id to a column', () => {
      const store = createStore()
      expect(store.$activeColumn()).toBe(null)
      const id = store.openApp('calendar')
      store.setActive(id)
      expect(store.$activeColumn()?.id).toBe(id)
    })

    it('$requireExtension is true for ext-required active kinds', () => {
      const store = createStore()
      const trendingId = store.columns()[0].id
      store.setActive(trendingId)
      expect(store.$requireExtension()).toBe(true)
      const settingsId = store.openApp('settings')
      store.setActive(settingsId)
      expect(store.$requireExtension()).toBe(false)
    })

    it('$disableSidebar is true only for an active onboarding column', () => {
      const store = createStore()
      const onboardingId = store.openApp('onboarding')
      store.setActive(onboardingId)
      expect(store.$disableSidebar()).toBe(true)
      const calId = store.openApp('calendar')
      store.setActive(calId)
      expect(store.$disableSidebar()).toBe(false)
    })
  })
})
