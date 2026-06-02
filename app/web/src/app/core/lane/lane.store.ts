import { computed } from '@angular/core'
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals'

import {
  DEFAULT_LANDING,
  DEFAULT_WIDTH,
  EXT_REQUIRED_KINDS,
  MAX_WIDTH,
  MIN_WIDTH,
  WIDTH_STEPS,
} from './lane.const'
import type {
  Column,
  ColumnKind,
  DetailsTab,
  LaneState,
  PinnedItem,
  Playing,
} from './lane.types'

let _seq = 1

function uid(): string {
  return `c${_seq++}`
}

function makeColumn(kind: ColumnKind, extra: Partial<Column> = {}): Column {
  return { id: uid(), width: DEFAULT_WIDTH[kind], kind, ...extra } as Column
}

const initial: LaneState = {
  columns: [makeColumn('trending')],
  activeId: null,
  playing: null,
  floating: false,
  danmakuOn: true,
  pinned: [],
}

export const LaneStore = signalStore(
  { providedIn: 'root' },
  withState(initial),
  withComputed((s) => ({
    $playerColumnId: computed(() => {
      return s.columns().find((c) => c.kind === 'player')?.id ?? null
    }),
    $activeColumn: computed(() => {
      return s.columns().find((c) => c.id === s.activeId()) ?? null
    }),
    $requireExtension: computed(() => {
      const k = s.columns().find((c) => c.id === s.activeId())?.kind
      return k != null && EXT_REQUIRED_KINDS.has(k)
    }),
    $disableSidebar: computed(() => {
      return (
        s.columns().find((c) => c.id === s.activeId())?.kind === 'onboarding'
      )
    }),
  })),
  withMethods((store) => ({
    openApp(kind: ColumnKind): string {
      const existing = store.columns().find((c) => c.kind === kind)
      if (existing) {
        return existing.id
      }
      const col = makeColumn(kind)
      patchState(store, { columns: [...store.columns(), col] })
      return col.id
    },

    openDetails(subjectId: number, _title: string, dup = false): string {
      if (!dup) {
        const existing = store
          .columns()
          .find((c) => c.kind === 'show' && c.subjectId === subjectId)
        if (existing) {
          return existing.id
        }
      }
      const col = makeColumn('show', { subjectId, sub: `#${subjectId}` })
      patchState(store, { columns: [...store.columns(), col] })
      return col.id
    },

    openWatch(opts: {
      subjectId?: number
      title: string
      episode?: number
      source?: string
      url?: string
      policyName?: string
    }): string {
      const prev = store.playing()
      const sameShow = prev != null && prev.subjectId === opts.subjectId
      // episode is a 0-based playlist index, so a fresh watch starts at 0
      const fallbackEpisode = sameShow && prev != null ? prev.episode : 0
      const playing: Playing = {
        subjectId: opts.subjectId,
        title: opts.title,
        episode: opts.episode ?? fallbackEpisode,
        source: opts.source ?? prev?.source ?? '',
        url: opts.url,
        policyName: opts.policyName,
      }
      const existing = store.columns().find((c) => c.kind === 'player')
      if (existing) {
        patchState(store, {
          playing,
          columns: store.columns().map((c) => {
            if (c.kind !== 'player') {
              return c
            }
            return {
              ...c,
              sub: '播放中',
              subjectId: opts.subjectId,
              url: opts.url,
              policyName: opts.policyName,
            }
          }),
        })
        return existing.id
      }
      const col = makeColumn('player', {
        sub: '播放中',
        subjectId: opts.subjectId,
        url: opts.url,
        policyName: opts.policyName,
      })
      patchState(store, { playing, columns: [...store.columns(), col] })
      return col.id
    },

    openComments(subjectId: number, _title: string): string {
      const existing = store
        .columns()
        .find((c) => c.kind === 'comments' && c.subjectId === subjectId)
      if (existing) {
        return existing.id
      }
      const col = makeColumn('comments', { subjectId, sub: `#${subjectId}` })
      patchState(store, { columns: [...store.columns(), col] })
      return col.id
    },

    openShowTab(subjectId: number, tab: DetailsTab): string {
      const existing = store
        .columns()
        .find(
          (c) =>
            c.kind === 'showtab' && c.subjectId === subjectId && c.tab === tab
        )
      if (existing) {
        return existing.id
      }
      const col = makeColumn('showtab', {
        subjectId,
        tab,
        sub: `#${subjectId}`,
      })
      patchState(store, { columns: [...store.columns(), col] })
      return col.id
    },

    close(id: string) {
      const cols = store.columns()
      const idx = cols.findIndex((c) => c.id === id)
      if (cols[idx]?.kind === 'player') {
        patchState(store, { playing: null, floating: false })
      }
      const filtered = cols.filter((c) => c.id !== id)
      const columns = filtered.length ? filtered : [makeColumn(DEFAULT_LANDING)]
      let activeId = store.activeId()
      if (id === activeId) {
        // point active at the nearest remaining column so it doesn't dangle
        const fallback = columns[Math.min(idx, columns.length - 1)]
        activeId = fallback ? fallback.id : null
      }
      patchState(store, { columns, activeId })
    },

    resize(id: string) {
      patchState(store, {
        columns: store.columns().map((c) => {
          if (c.id !== id) {
            return c
          }
          const steps = WIDTH_STEPS[c.kind] ?? WIDTH_STEPS._
          const i = steps.findIndex((w) => w >= c.width)
          const nextW = steps[(i + 1) % steps.length] ?? steps[0]
          return { ...c, width: nextW, full: false }
        }),
      })
    },

    setWidth(id: string, width: number) {
      const clamped = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, Math.round(width))
      )
      patchState(store, {
        columns: store
          .columns()
          .map((c) =>
            c.id === id ? { ...c, width: clamped, full: false } : c
          ),
      })
    },

    toggleFull(id: string) {
      patchState(store, {
        columns: store
          .columns()
          .map((c) => (c.id === id ? { ...c, full: !c.full } : c)),
      })
    },

    reorder(from: number, to: number) {
      const next = [...store.columns()]
      if (
        from === to ||
        from < 0 ||
        from >= next.length ||
        to < 0 ||
        to >= next.length
      ) {
        return
      }
      const [m] = next.splice(from, 1)
      next.splice(to, 0, m)
      patchState(store, { columns: next })
    },

    togglePin(item: PinnedItem) {
      const has = store.pinned().some((p) => p.key === item.key)
      patchState(store, {
        pinned: has
          ? store.pinned().filter((p) => p.key !== item.key)
          : [...store.pinned(), item],
      })
    },

    unpin(key: number) {
      patchState(store, {
        pinned: store.pinned().filter((p) => p.key !== key),
      })
    },

    setEpisode(n: number) {
      const p = store.playing()
      if (p) {
        patchState(store, { playing: { ...p, episode: n } })
      }
    },

    setSource(source: string) {
      const p = store.playing()
      if (p) {
        patchState(store, { playing: { ...p, source } })
      }
    },

    toggleDanmaku() {
      patchState(store, { danmakuOn: !store.danmakuOn() })
    },

    setActive(id: string) {
      patchState(store, { activeId: id })
    },

    setFloating(floating: boolean) {
      patchState(store, { floating })
    },

    setDetailsTab(id: string, tab: DetailsTab) {
      patchState(store, {
        columns: store.columns().map((c) => {
          if (c.id === id && c.kind === 'show') {
            return { ...c, tab }
          }
          return c
        }),
      })
    },

    setSearchQuery(id: string, query: string) {
      patchState(store, {
        columns: store.columns().map((c) => {
          if (c.id === id && c.kind === 'search') {
            return { ...c, query }
          }
          return c
        }),
      })
    },
  }))
)
