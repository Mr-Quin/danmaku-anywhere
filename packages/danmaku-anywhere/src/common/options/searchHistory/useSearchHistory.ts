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

  const meta = { invalidates: [queryKey] }

  const addEntryMutation = useMutation({
    mutationFn: service.addEntry.bind(service),
    meta,
  })

  const removeEntryMutation = useMutation({
    mutationFn: service.removeEntry.bind(service),
    meta,
  })

  const clearHistoryMutation = useMutation({
    mutationFn: service.clearHistory.bind(service),
    meta,
  })

  return {
    entries: data.entries,
    addEntry: addEntryMutation,
    removeEntry: removeEntryMutation,
    clearHistory: clearHistoryMutation,
  }
}
