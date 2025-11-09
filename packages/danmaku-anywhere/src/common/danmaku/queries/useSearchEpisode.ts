import { useSuspenseQuery } from '@tanstack/react-query'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useSearchEpisode = (seasonId: number) => {
  return useSuspenseQuery({
    queryKey: seasonQueryKeys.episodes(seasonId),
    queryFn: () => {
      return chromeRpcClient.episodeFetchBySeason({
        seasonId,
      })
    },
    select: (data) => data.data,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}
