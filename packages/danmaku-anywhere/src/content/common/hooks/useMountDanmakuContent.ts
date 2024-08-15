import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { useDanmakuQuerySuspense } from '@/common/danmaku/queries/useDanmakuQuerySuspense'
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
    mutationFn: async (danmaku: DanmakuLite) => {
      const data = await queryClient.fetchQuery({
        queryKey: useDanmakuQuerySuspense.queryKey({ id: danmaku.id }),
        queryFn: () => chromeRpcClient.danmakuGetOne({ id: danmaku.id }),
      })

      if (!data) throw new Error('No danmaku found')

      return data
    },
    onSuccess: (data) => {
      mountManual(data)
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
