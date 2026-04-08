import { useMemo } from 'react'
import { MAX_SEARCH_HISTORY_ENTRIES } from '@/common/options/searchHistory/constant'
import type {
  SearchHistoryData,
  SearchHistoryOptions,
} from '@/common/options/searchHistory/schema'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'

export function useSearchHistory() {
  const store = useSuspenseExtStorageQuery<SearchHistoryOptions>(
    'searchHistory',
    {
      storageType: 'local',
    }
  )

  const storageService = useMemo(() => {
    return new ExtStorageService<SearchHistoryOptions>('searchHistory', {
      storageType: 'local',
    })
  }, [])

  const entries = store.data.data.entries

  const readLatestEntries = async () => {
    const current = await storageService.read()
    return current?.data.entries ?? []
  }

  const writeEntries = async (newEntries: string[]) => {
    await store.update.mutateAsync({
      data: { entries: newEntries } satisfies SearchHistoryData,
      version: store.data.version,
    })
  }

  const addEntry = async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      return
    }
    const latest = await readLatestEntries()
    const filtered = latest.filter((e) => e !== trimmed)
    const newEntries = [trimmed, ...filtered].slice(
      0,
      MAX_SEARCH_HISTORY_ENTRIES
    )
    await writeEntries(newEntries)
  }

  const removeEntry = async (query: string) => {
    const latest = await readLatestEntries()
    const newEntries = latest.filter((e) => e !== query)
    await writeEntries(newEntries)
  }

  const clearHistory = async () => {
    await writeEntries([])
  }

  return {
    entries,
    addEntry,
    removeEntry,
    clearHistory,
  }
}
