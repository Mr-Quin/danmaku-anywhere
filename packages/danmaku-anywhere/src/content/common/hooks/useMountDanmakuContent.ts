import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { useDanmakuQuerySuspense } from '@/common/danmaku/queries/useDanmakuQuerySuspense'
import type { DanmakuMeta } from '@/common/danmaku/types/types'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/content/store/store'

export const useMountDanmakuContent = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const mountManual = useStore((state) => state.mountManual)
  const getAnimeName = useStore((state) => state.getAnimeName)

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (danmakuMeta: DanmakuMeta) => {
      const data = await queryClient.fetchQuery({
        queryKey: useDanmakuQuerySuspense.queryKey(danmakuMeta),
        queryFn: () =>
          chromeRpcClient.danmakuGetOne({
            type: danmakuMeta.type,
            id: danmakuMeta.episodeId,
          }),
      })

      if (!data) throw new Error('No danmaku found')

      return data
    },
    onSuccess: (data, meta) => {
      mountManual(data.comments, meta)
      toast.success(
        t('danmaku.alert.mounted', {
          name: getAnimeName(),
          count: data.comments.length,
        })
      )
    },
    onError: (e) => {
      toast.error(
        t('danmaku.alert.mountError', {
          message: (e as Error).message,
        })
      )
      Logger.debug(e)
    },
  })
}
