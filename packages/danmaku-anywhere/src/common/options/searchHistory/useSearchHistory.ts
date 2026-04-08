import { useMutation } from '@tanstack/react-query'
import { useInjectService } from '@/common/hooks/useInjectService'
import type { SearchHistoryOptions } from '@/common/options/searchHistory/schema'
import { SearchHistoryService } from '@/common/options/searchHistory/service'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'

export function useSearchHistory() {
  const store = useSuspenseExtStorageQuery<SearchHistoryOptions>(
    'searchHistory',
    {
      storageType: 'local',
    }
  )

  const service = useInjectService(SearchHistoryService)
  const queryKey = storageQueryKeys.external('local', ['searchHistory'])

  const addEntryMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: service.addEntry.bind(service),
  })

  const removeEntryMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: service.removeEntry.bind(service),
  })

  const clearHistoryMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: service.clearHistory.bind(service),
  })

  return {
    entries: store.data.data.entries,
    addEntry: addEntryMutation,
    removeEntry: removeEntryMutation,
    clearHistory: clearHistoryMutation,
  }
}
