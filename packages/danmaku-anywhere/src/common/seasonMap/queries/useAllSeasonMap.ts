import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
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
  const queryClient = useQueryClient()

  return {
    add: useMutation({
      mutationFn: async (map: SeasonMap) => {
        return chromeRpcClient.seasonMapAdd(map.toSnapshot())
      },
      onSuccess: () => {
        return queryClient.invalidateQueries({
          queryKey: seasonMapQueryKeys.all(),
        })
      },
    }),
    delete: useMutation({
      mutationFn: async (key: string) => {
        return chromeRpcClient.seasonMapDelete({ key })
      },
      onSuccess: () => {
        return queryClient.invalidateQueries({
          queryKey: seasonMapQueryKeys.all(),
        })
      },
    }),
    removeProvider: useMutation({
      mutationFn: async (data: { key: string; providerConfigId: string }) => {
        return chromeRpcClient.seasonMapRemoveProvider(data)
      },
      onSuccess: () => {
        return queryClient.invalidateQueries({
          queryKey: seasonMapQueryKeys.all(),
        })
      },
    }),
  }
}

export const useSeasonsByIds = (ids: number[]) => {
  return useQuery({
    queryKey: ['seasons', 'byIds', ids],
    queryFn: async () => {
      if (ids.length === 0) return []
      const res = await chromeRpcClient.seasonFilter({ ids })
      return res.data
    },
    enabled: ids.length > 0,
  })
}
