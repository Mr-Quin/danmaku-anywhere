import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'

import { episodeToString } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import { tabQueryKeys } from '@/common/queries/queryKeys'
import { controllerRpcClient } from '@/common/rpcClient/controller/client'

export const useMountDanmakuPopup = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationKey: tabQueryKeys.getState(),
    mutationFn: async (episodes: GenericEpisodeLite[]) => {
      await controllerRpcClient.danmakuMount(episodes)
    },
    onSuccess: (_, episodes) => {
      if (episodes.length === 1) {
        const episode = episodes[0]
        toast.success(
          t('danmaku.alert.mounted', 'Danmaku Mounted: {{name}} ({{count}})', {
            name: episodeToString(episode),
            count: episode.commentCount,
          })
        )
      } else {
        toast.success(
          t(
            'danmaku.alert.mountedMultiple',
            'Mounted {{count}} selected danmaku',
            {
              count: episodes.length,
            }
          )
        )
      }
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
