import type {
  CommentEntity,
  GenericEpisode,
} from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchDto, MacCMSFetchData } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useFetchGenericDanmaku } from '@/common/danmaku/queries/useFetchGenericDanmaku'
import { episodeToString, isProvider } from '@/common/danmaku/utils'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { concatArr } from '@/common/utils/utils'
import { useStore } from '@/content/controller/store/store'

const useMountDanmaku = () => {
  const { toast } = useToast()

  const { mustGetActiveFrame, updateFrame } = useStore.use.frame()
  const { mount } = useStore.use.danmaku()

  return useMutation({
    mutationFn: async (episodes: GenericEpisode[]) => {
      const comments: CommentEntity[] = []

      episodes.forEach((episode) => {
        concatArr(comments, episode.comments)
      })

      const res = await playerRpcClient.player['relay:command:mount']({
        frameId: mustGetActiveFrame().frameId,
        data: comments,
      })

      if (!res.data) {
        throw new Error('Failed to mount danmaku')
      }
    },
    onSuccess: (_, danmaku) => {
      mount(danmaku)
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

  const { episodes } = useStore.use.danmaku()

  const fetchMutation = useFetchDanmaku()
  const fetchGenericMutation = useFetchGenericDanmaku()
  const mountMutation = useMountDanmaku()

  const canRefresh =
    !!episodes &&
    episodes.length === 1 &&
    isProvider(episodes[0], DanmakuSourceType.DanDanPlay)

  const mountDanmaku = useEventCallback((episodes: GenericEpisode[]) => {
    return mountMutation.mutateAsync(episodes, {
      // This is called in addition to the onSuccess of mountMutation
      onSuccess: () => {
        if (episodes.length === 1) {
          const episode = episodes[0]
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
        } else {
          toast.success(
            t('danmaku.alert.mountedMultiple', {
              count: episodes.length,
            })
          )
        }
      },
    })
  })

  const loadMutation = useMutation({
    mutationFn: async (data: DanmakuFetchDto) => {
      return fetchMutation.mutateAsync(data, {
        onSuccess: (cache) => {
          mountDanmaku([cache])
        },
        onError: (err) => {
          toast.error(err.message)
        },
      })
    },
  })

  const loadGenericMutation = useMutation({
    mutationFn: async (data: MacCMSFetchData) => {
      return fetchGenericMutation.mutateAsync(data, {
        onSuccess: (cache) => {
          mountDanmaku([cache])
        },
        onError: (err) => {
          toast.error(err.message)
        },
      })
    },
  })

  const refreshComments = useEventCallback(async () => {
    if (!canRefresh) return
    const episode = episodes[0]
    // check again to narrow the type
    if (!isProvider(episode, DanmakuSourceType.DanDanPlay)) return

    toast.info(t('danmaku.alert.refreshingDanmaku'))
    loadMutation.mutate(
      { type: 'by-meta', meta: episode, options: { forceUpdate: true } },
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

  return {
    loadMutation,
    loadGenericMutation,
    refreshComments,
    canRefresh,
    mountDanmaku,
  }
}
