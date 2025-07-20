import type { GenericEpisode } from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { episodeToString, isProvider } from '@/common/danmaku/utils'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/content/controller/store/store'

export const useMountDanmaku = () => {
  const { toast } = useToast()

  const { mustGetActiveFrame, updateFrame } = useStore.use.frame()
  const { mount } = useStore.use.danmaku()

  return useMutation({
    mutationFn: async (danmaku: GenericEpisode) => {
      const res = await playerRpcClient.player['relay:command:mount']({
        frameId: mustGetActiveFrame().frameId,
        data: danmaku.comments,
      })
      if (!res.data) {
        throw new Error('Failed to mount danmaku')
      }
      return true
    },
    onSuccess: (_, danmaku) => {
      mount(danmaku, danmaku.comments)
      updateFrame(mustGetActiveFrame().frameId, { mounted: true })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

// Wrapper around useFetchDanmaku and useMountDanmaku
export const useLoadDanmaku = () => {
  const { t } = useTranslation()

  const toast = useToast.use.toast()

  const { danmakuLite } = useStore.use.danmaku()

  const fetchMutation = useFetchDanmaku()
  const mountMutation = useMountDanmaku()

  const canRefresh =
    !!danmakuLite && isProvider(danmakuLite, DanmakuSourceType.DanDanPlay)

  const mountDanmaku = useEventCallback((episode: GenericEpisode) => {
    return mountMutation.mutateAsync(episode, {
      // This is called in addition to the onSuccess of mountMutation
      onSuccess: () => {
        toast.success(
          t('danmaku.alert.mounted', {
            name: episodeToString(episode),
            count: episode.commentCount,
          }),
          {
            actionFn: isProvider(episode, DanmakuSourceType.DanDanPlay)
              ? refreshComments
              : undefined,
            actionLabel: t('danmaku.refresh'),
          }
        )
      },
    })
  })

  const loadMutation = useMutation({
    mutationFn: async (data: DanmakuFetchDto) => {
      return fetchMutation.mutateAsync(data, {
        onSuccess: (cache) => {
          mountDanmaku(cache)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      })
    },
  })

  const refreshComments = useEventCallback(async () => {
    if (!canRefresh) return

    toast.info(t('danmaku.alert.refreshingDanmaku'))
    loadMutation.mutate(
      { meta: danmakuLite, options: { forceUpdate: true } },
      {
        onSuccess: (result) => {
          toast.success(
            t('danmaku.alert.refreshed', {
              name: episodeToString(result),
              count: result.commentCount,
            })
          )
        },
      }
    )
  })

  return { loadMutation, refreshComments, canRefresh, mountDanmaku }
}
