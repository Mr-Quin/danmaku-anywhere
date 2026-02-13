import { useQuery } from '@tanstack/react-query'
import { authQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useAuthSession = () => {
  return useQuery({
    queryKey: authQueryKeys.session(),
    queryFn: async () => {
      const res = await chromeRpcClient.authGetSession(undefined, {
        silent: true,
      })
      return res.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
