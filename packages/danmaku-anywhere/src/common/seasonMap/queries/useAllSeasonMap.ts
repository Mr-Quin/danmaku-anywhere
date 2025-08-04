import { useSuspenseQuery } from '@tanstack/react-query'
import { seasonMapQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useAllSeasonMap = () => {
  return useSuspenseQuery({
    queryKey: seasonMapQueryKeys.all(),
    queryFn: async () => {
      const res = await chromeRpcClient.seasonMapGetAll()
      return res.data
    },
  })
}
