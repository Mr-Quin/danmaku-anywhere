import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Logger } from '@/common/Logger'
import { useToast } from '@/common/components/Toast/toastStore'
import type { EpisodeQueryFilter } from '@/common/danmaku/dto'
import { episodeToString } from '@/common/danmaku/utils'
import { episodeQueryKeys, tabQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { tabRpcClient } from '@/common/rpcClient/tab/client'

export const useMountDanmakuPopup = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: tabQueryKeys.getState(),
    mutationFn: async (filter: EpisodeQueryFilter) => {
      const res = await queryClient.fetchQuery({
        queryKey: episodeQueryKeys.filter(filter),
        queryFn: () => chromeRpcClient.episodeFilter(filter),
      })

      if (res.data.length === 0) throw new Error('No danmaku found')

      await tabRpcClient.danmakuMount(res.data[0])

      return res.data[0]
    },
    onSuccess: (data) => {
      toast.success(
        t('danmaku.alert.mounted', {
          name: episodeToString(data),
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
