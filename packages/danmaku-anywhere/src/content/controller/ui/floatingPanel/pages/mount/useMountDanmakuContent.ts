import type {
  GenericEpisode,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { isNotCustom } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import {
  customEpisodeQueryKeys,
  episodeQueryKeys,
} from '@/common/queries/queryKeys'
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
    mutationFn: async (
      danmaku: GenericEpisodeLite
    ): Promise<GenericEpisode> => {
      if (isNotCustom(danmaku)) {
        const data = await queryClient.fetchQuery({
          queryKey: episodeQueryKeys.filter({ id: danmaku.id }),
          queryFn: async () => {
            const res = await chromeRpcClient.episodeFilter({ id: danmaku.id })
            return res.data[0] || null
          },
        })
        if (!data) throw new Error('No danmaku found')
        return data
      }
      const data = await queryClient.fetchQuery({
        queryKey: customEpisodeQueryKeys.filter({ id: danmaku.id }),
        queryFn: async () => {
          const res = await chromeRpcClient.episodeFilterCustom({
            id: danmaku.id,
          })
          return res.data[0] || null
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
