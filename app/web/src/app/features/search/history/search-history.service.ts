import { computed, Injectable, signal } from '@angular/core'

import type { SearchHistoryEntry, SearchModel } from '../search-model.type'

const STORAGE_KEY = 'da.search.history.v1'
const MAX_ENTRIES = 50

function stableStringify(value: unknown): string {
  const seen = new WeakSet()
  return JSON.stringify(
    value,
    function (key, val) {
      if (val && typeof val === 'object') {
        if (seen.has(val as object)) return
        seen.add(val as object)
        if (!Array.isArray(val)) {
          return Object.keys(val as Record<string, unknown>)
            .sort()
            .reduce(
              (acc, k) => {
                ;(acc as Record<string, unknown>)[k] = (
                  val as Record<string, unknown>
                )[k]
                return acc
              },
              {} as Record<string, unknown>
            )
        }
      }
      return val
    },
    0
  )
}

function isSameSearch(a: SearchHistoryEntry, b: SearchModel): boolean {
  return (
    a.provider === b.provider &&
    a.term === b.term &&
    a.sorting === b.sorting &&
    stableStringify(a.filter ?? null) === stableStringify(b.filter ?? null)
  )
}

@Injectable({ providedIn: 'root' })
export class SearchHistoryService {
  private readonly $_entries = signal<SearchHistoryEntry[]>([])

  readonly $entries = this.$_entries.asReadonly()
  readonly $hasEntries = computed(() => this.$_entries().length > 0)

  constructor() {
    this.load()
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return
      }
      const parsed = JSON.parse(raw) as SearchHistoryEntry[]
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((e) => !!e)
          .map((e) => ({
            ...e,
            sorting: e.sorting ?? undefined,
            filter: e.filter ?? undefined,
          }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_ENTRIES)

        this.$_entries.set(normalized as SearchHistoryEntry[])
      }
    } catch {
      // ignore
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.$_entries()))
    } catch {
      // ignore
    }
  }

  add(entry: SearchModel) {
    const now = Date.now()
    const current = this.$_entries()
    const existingIndex = current.findIndex((e) => isSameSearch(e, entry))

    let next: SearchHistoryEntry[]

    if (existingIndex >= 0) {
      const existing = current[existingIndex]
      const updated: SearchHistoryEntry = { ...existing, timestamp: now }

      next = [
        updated,
        ...current.slice(0, existingIndex),
        ...current.slice(existingIndex + 1),
      ]
    } else {
      next = [{ ...entry, timestamp: now }, ...current]
    }

    if (next.length > MAX_ENTRIES) {
      next = next.slice(0, MAX_ENTRIES)
    }

    this.$_entries.set(next)
    this.persist()
  }

  delete(index: number) {
    const next = this.$_entries().filter((_, i) => i !== index)
    this.$_entries.set(next)
    this.persist()
  }
}
