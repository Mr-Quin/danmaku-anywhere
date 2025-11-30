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
import { concatArr } from '@/common/utils/utils'
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
      episodesLite: GenericEpisodeLite[]
    ): Promise<GenericEpisode[]> => {
      const partition = Object.groupBy(episodesLite, (e) => {
        if (isNotCustom(e)) {
          return 'other'
        }
        return 'custom'
      })

      const episodes: GenericEpisode[] = []

      if (partition.custom) {
        const ids = partition.custom.map((e) => e.id)
        const data = await queryClient.fetchQuery({
          queryKey: customEpisodeQueryKeys.filter({ ids }),
          queryFn: async () => {
            const res = await chromeRpcClient.episodeFilterCustom({ ids })
            return res.data
          },
        })
        concatArr(episodes, data)
      }

      if (partition.other) {
        const ids = partition.other.map((e) => e.id)
        const data = await queryClient.fetchQuery({
          queryKey: episodeQueryKeys.filter({ ids }),
          queryFn: async () => {
            const res = await chromeRpcClient.episodeFilter({ ids })
            return res.data
          },
        })
        concatArr(episodes, data)
      }

      if (episodes.length === 0) {
        throw new Error('No danmaku found')
      }

      return episodes
    },
    onSuccess: (data) => {
      toggleManualMode(true)
      void mountDanmaku(data)
    },
    onError: (e) => {
      toast.error(
        t('danmaku.alert.mountError', 'Failed to mount danmaku: {{message}}', {
          message: (e as Error).message,
        })
      )
      Logger.debug(e)
    },
  })
}
