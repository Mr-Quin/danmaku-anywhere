import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '../../components/toast/toastStore'
import { chromeRpcClient } from '../../rpc/client'

import { useAllDanmakuQuerySuspense } from './useAllDanmakuQuerySuspense'
import { useDanmakuQuerySuspense } from './useDanmakuQuerySuspense'

export const useDeleteDanmaku = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await chromeRpcClient.danmakuDelete(id)
    },
    onError: (e) => {
      toast.error(
        t('danmaku.alert.deleteError', {
          message: e.message,
        })
      )
    },
    onSuccess: (_, id) => {
      toast.success(t('danmaku.alert.deleted'))
      queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: useDanmakuQuerySuspense.queryKey(id),
      })
    },
  })
}
