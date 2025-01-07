import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { Logger } from '@/common/Logger'
import { danmakuQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useStore } from '@/content/controller/store/store'

export const useMountDanmakuContent = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { toggleManualMode } = useStore.use.danmaku()

  const queryClient = useQueryClient()

  const { mountDanmaku } = useLoadDanmaku()

  return useMutation({
    mutationFn: async (danmaku: DanmakuLite) => {
      const data = await queryClient.fetchQuery({
        queryKey: danmakuQueryKeys.one({ id: danmaku.id }),
        queryFn: async () => {
          const res = await chromeRpcClient.danmakuGetOne({ id: danmaku.id })
          return res.data
        },
      })

      if (!data) throw new Error('No danmaku found')

      return data
    },
    onSuccess: (data) => {
      toggleManualMode(true)
      void mountDanmaku(data)
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
