import {
  DanmakuSourceType,
  type RemoteDanmakuSourceType,
} from '@danmaku-anywhere/danmaku-converter'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type {
  CustomEpisodeQueryFilter,
  EpisodeQueryFilter,
} from '@/common/danmaku/dto'
import { episodeToString } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import {
  customEpisodeQueryKeys,
  episodeQueryKeys,
  tabQueryKeys,
} from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { controllerRpcClient } from '@/common/rpcClient/controller/client'

export type MountDanmakuPopupInput =
  | {
      provider: DanmakuSourceType.Custom
      filter: CustomEpisodeQueryFilter
    }
  | {
      provider: RemoteDanmakuSourceType
      filter: EpisodeQueryFilter
    }

export const useMountDanmakuPopup = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: tabQueryKeys.getState(),
    mutationFn: async ({ provider, filter }: MountDanmakuPopupInput) => {
      if (provider === DanmakuSourceType.Custom) {
        const res = await queryClient.fetchQuery({
          queryKey: customEpisodeQueryKeys.filter(filter),
          queryFn: () => chromeRpcClient.episodeFilterCustom(filter),
        })
        if (res.data.length === 0) throw new Error('No danmaku found')
        await controllerRpcClient.danmakuMount(res.data[0])

        return res.data[0]
      }

      const res = await queryClient.fetchQuery({
        queryKey: episodeQueryKeys.filter(filter),
        queryFn: () => chromeRpcClient.episodeFilter(filter),
      })

      if (res.data.length === 0) throw new Error('No danmaku found')

      await controllerRpcClient.danmakuMount(res.data[0])

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
