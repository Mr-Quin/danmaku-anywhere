import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { seasonMapQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'

export const useAllSeasonMap = () => {
  return useSuspenseQuery({
    queryKey: seasonMapQueryKeys.all(),
    queryFn: async () => {
      const res = await chromeRpcClient.seasonMapGetAll()
      return SeasonMap.reviveAll(res.data)
    },
  })
}

export const useSeasonMapMutations = () => {
  return {
    add: useMutation({
      mutationKey: seasonMapQueryKeys.all(),
      mutationFn: async (map: SeasonMap) => {
        return chromeRpcClient.seasonMapAdd(map.toSnapshot())
      },
    }),
    delete: useMutation({
      mutationKey: seasonMapQueryKeys.all(),
      mutationFn: async (key: string) => {
        return chromeRpcClient.seasonMapDelete({ key })
      },
    }),
  }
}
