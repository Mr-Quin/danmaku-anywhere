import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { bookmarkQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useBookmarksSuspense = () => {
  return useSuspenseQuery({
    queryKey: bookmarkQueryKeys.all(),
    queryFn: () => chromeRpcClient.bookmarkGetAll(),
    select: (data) => data.data,
    staleTime: 1000 * 60 * 5,
  })
}

export const useBookmarkedSeasonIds = () => {
  return useQuery({
    queryKey: bookmarkQueryKeys.all(),
    queryFn: () => chromeRpcClient.bookmarkGetAll(),
    select: (data) => new Set(data.data.map((b) => b.seasonId)),
    staleTime: 1000 * 60 * 5,
  })
}
