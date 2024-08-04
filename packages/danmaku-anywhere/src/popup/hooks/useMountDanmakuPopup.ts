import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuMeta } from '@/common/danmaku/models/danmakuMeta'
import { useDanmakuQuerySuspense } from '@/common/danmaku/queries/useDanmakuQuerySuspense'
import { danmakuMetaToString } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { tabRpcClient } from '@/common/rpcClient/tab/client'

export const useMountDanmakuPopup = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

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

      await tabRpcClient.danmakuMount({
        meta: danmakuMeta,
        comments: data.comments,
      })

      return data
    },
    onSuccess: (data) => {
      toast.success(
        t('danmaku.alert.mounted', {
          name: danmakuMetaToString(data.meta),
          count: data.comments.length,
        })
      )
    },
    onError: (e) => {
      toast.error(
        t('danmaku.alert.mountError', { message: (e as Error).message })
      )
      Logger.debug(e)
    },
  })
}
