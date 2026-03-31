import { useSuspenseQuery } from '@tanstack/react-query'
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
