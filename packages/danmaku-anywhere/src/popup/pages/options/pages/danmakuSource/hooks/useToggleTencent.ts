import { useMutation, useQuery } from '@tanstack/react-query'

import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useToggleTencent = () => {
  const { toggle, isLoading } = useDanmakuSources()

  const query = useQuery({
    queryFn: () => chromeRpcClient.tencentTestCookies(),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.tencent(),
    refetchOnWindowFocus: false,
  })

  const mutation = useMutation({
    mutationFn: async (checked: boolean) => {
      if (!checked) return toggle('tencent', false)

      await toggle('tencent', true)
    },
  })

  return {
    canEnable: query.data,
    toggle: mutation.mutate,
    isLoading: isLoading || mutation.isPending || query.isLoading,
  }
}
