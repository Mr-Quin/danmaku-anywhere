import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '../../components/toast/toastStore'
import { chromeRpcClient } from '../../rpc/client'

import { useAllDanmakuQuerySuspense } from './useAllDanmakuQuerySuspense'
import { useDanmakuQuerySuspense } from './useDanmakuQuerySuspense'

import type { DanmakuMeta } from '@/common/types/danmaku/Danmaku'

export const useDeleteDanmaku = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (meta: DanmakuMeta) => {
      await chromeRpcClient.danmakuDelete({
        type: meta.type,
        id: meta.episodeId,
      })
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
      void queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey(),
      })
      void queryClient.invalidateQueries({
        queryKey: useDanmakuQuerySuspense.queryKey(id),
      })
    },
  })
}
