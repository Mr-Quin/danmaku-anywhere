import { MAX_SEARCH_HISTORY_ENTRIES } from '@/common/options/searchHistory/constant'
import type { SearchHistoryOptions } from '@/common/options/searchHistory/schema'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'

export function useSearchHistory() {
  const store = useSuspenseExtStorageQuery<SearchHistoryOptions>(
    'searchHistory',
    {
      storageType: 'local',
    }
  )

  const entries = store.data.data.entries

  const updateEntries = async (newEntries: string[]) => {
    await store.update.mutateAsync({
      data: { entries: newEntries },
      version: store.data.version,
    })
  }

  const addEntry = async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      return
    }
    const filtered = entries.filter((e) => e !== trimmed)
    const newEntries = [trimmed, ...filtered].slice(
      0,
      MAX_SEARCH_HISTORY_ENTRIES
    )
    await updateEntries(newEntries)
  }

  const removeEntry = async (query: string) => {
    const newEntries = entries.filter((e) => e !== query)
    await updateEntries(newEntries)
  }

  const clearHistory = async () => {
    await updateEntries([])
  }

  return {
    entries,
    addEntry,
    removeEntry,
    clearHistory,
  }
}
