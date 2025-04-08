import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Logger } from '@/common/Logger'
import { useToast } from '@/common/components/Toast/toastStore'
import type { QueryEpisodeFilter } from '@/common/danmaku/dto'
import { danmakuToString } from '@/common/danmaku/utils'
import { danmakuQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { tabRpcClient } from '@/common/rpcClient/tab/client'

export const useMountDanmakuPopup = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: QueryEpisodeFilter) => {
      const res = await queryClient.fetchQuery({
        queryKey: danmakuQueryKeys.one(data),
        queryFn: () => chromeRpcClient.episodeGetOne({ id: data.id }),
      })

      if (!res.data) throw new Error('No danmaku found')

      await tabRpcClient.danmakuMount(res.data)

      return res.data
    },
    onSuccess: (data) => {
      toast.success(
        t('danmaku.alert.mounted', {
          name: danmakuToString(data),
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
