import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useAllDanmakuQuerySuspense } from './useAllDanmakuQuerySuspense'
import { useDanmakuQuerySuspense } from './useDanmakuQuerySuspense'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuMeta } from '@/common/danmaku/models/danmakuMeta'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

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
        queryKey: useDanmakuQuerySuspense.queryKey({
          type: id.type,
          id: id.episodeId,
        }),
      })
    },
  })
}
