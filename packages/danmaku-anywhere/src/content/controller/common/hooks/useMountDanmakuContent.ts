import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { danmakuKeys } from '@/common/danmaku/queries/danmakuQueryKeys'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useMountDanmaku } from '@/content/controller/common/hooks/useMountDanmaku'
import { useStore } from '@/content/controller/store/store'

export const useMountDanmakuContent = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const mountManual = useStore((state) => state.mountManual)
  const getAnimeName = useStore((state) => state.getAnimeName)

  const queryClient = useQueryClient()

  const mountMutation = useMountDanmaku()

  return useMutation({
    mutationFn: async (danmaku: DanmakuLite) => {
      const data = await queryClient.fetchQuery({
        queryKey: danmakuKeys.one({ id: danmaku.id }),
        queryFn: async () => {
          const res = await chromeRpcClient.danmakuGetOne({ id: danmaku.id })
          return res.data
        },
      })

      if (!data) throw new Error('No danmaku found')

      return data
    },
    onSuccess: (data) => {
      mountManual()
      mountMutation.mutate(data, {
        onSuccess: () => {
          toast.success(
            t('danmaku.alert.mounted', {
              name: getAnimeName(),
              count: data.comments.length,
            })
          )
        },
      })
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
