import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '../../components/toast/toastStore'
import { chromeRpcClient } from '../../rpc/client'

import { useAllDanmakuQuerySuspense } from './useAllDanmakuQuerySuspense'
import { useDanmakuQuerySuspense } from './useDanmakuQuerySuspense'

export const useDeleteDanmaku = () => {
  const toast = useToast.use.toast()

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await chromeRpcClient.danmakuDelete(id)
    },
    onError: () => {
      toast.error('Failed to delete danmaku')
    },
    onSuccess: (_, id) => {
      toast.success('Danmaku deleted')
      queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: useDanmakuQuerySuspense.queryKey(id),
      })
    },
  })
}
