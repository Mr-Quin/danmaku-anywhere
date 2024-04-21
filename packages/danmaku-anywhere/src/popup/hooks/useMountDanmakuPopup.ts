import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/toast/toastStore'
import type { DanmakuMeta } from '@/common/db/db'
import { useDanmakuQuerySuspense } from '@/common/queries/danmaku/useDanmakuQuerySuspense'
import { chromeRpcClient, tabRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'
import { danmakuMetaToString } from '@/common/utils/utils'

export const useMountDanmakuPopup = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (danmakuMeta: DanmakuMeta) => {
      const data = await queryClient.fetchQuery({
        queryKey: useDanmakuQuerySuspense.queryKey(danmakuMeta.episodeId),
        queryFn: () =>
          chromeRpcClient.danmakuGetByEpisodeId(danmakuMeta.episodeId),
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
