import { useSuspenseQuery } from '@tanstack/react-query'
import { seasonMapQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { SeasonMap } from '@/common/seasonMap/types'

export const useAllSeasonMap = () => {
  return useSuspenseQuery({
    queryKey: seasonMapQueryKeys.all(),
    queryFn: async () => {
      const res = await chromeRpcClient.seasonMapGetAll()
      return SeasonMap.reviveAll(res.data)
    },
  })
}
