import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useInjectService } from '@/common/hooks/useInjectService'
import { SearchHistoryService } from '@/common/options/searchHistory/service'
import { storageQueryKeys } from '@/common/queries/queryKeys'

export function useSearchHistory() {
  const service = useInjectService(SearchHistoryService)
  const queryKey = storageQueryKeys.external('local', ['searchHistory'])

  const { data } = useSuspenseQuery({
    queryKey,
    queryFn: () => service.get(),
  })

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
    entries: data.entries,
    addEntry: addEntryMutation,
    removeEntry: removeEntryMutation,
    clearHistory: clearHistoryMutation,
  }
}
