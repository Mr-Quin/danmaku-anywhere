import type {
  CommentEntity,
  Episode,
  GenericEpisode,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchDto, MacCMSFetchData } from '@/common/danmaku/dto'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useFetchGenericDanmaku } from '@/common/danmaku/queries/useFetchGenericDanmaku'
import { episodeToString, isSourceEpisode } from '@/common/danmaku/utils'
import { describeSourceError } from '@/common/providers/describeSourceError'
import { capabilitiesOf, mayOffer } from '@/common/providers/sourceCapabilities'
import {
  sourceCapabilitiesQuery,
  useCanRefetchDanmaku,
} from '@/common/providers/useSourceCapabilities'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { concatArr } from '@/common/utils/utils'
import { useStore } from '@/content/controller/store/store'
import { DanmakuMountError, describeMountError } from './mountError'

const useMountDanmaku = () => {
  const { toast } = useToast()

  const { getActiveFrame, updateFrame } = useStore.use.frame()
  const { mount } = useStore.use.danmaku()

  return useMutation({
    mutationFn: async (episodes: GenericEpisode[]) => {
      const activeFrame = getActiveFrame()
      if (!activeFrame) {
        throw new DanmakuMountError(
          'noActiveFrame',
          'No active frame to mount danmaku'
        )
      }

      const comments: CommentEntity[] = []

      episodes.forEach((episode) => {
        concatArr(comments, episode.comments)
      })

      const res = await playerRpcClient.player['relay:command:mount']({
        frameId: activeFrame.frameId,
        data: comments,
      })

      if (!res.data) {
        throw new DanmakuMountError('mountFailed', 'Failed to mount danmaku')
      }

      return activeFrame.frameId
    },
    onSuccess: (mountedFrameId, danmaku) => {
      mount(danmaku)
      updateFrame(mountedFrameId, { mounted: true })
    },
    onError: (err) => {
      toast.error(describeMountError(err))
    },
  })
}

function isOnlyMounted(episode: Episode): boolean {
  const { isMounted, episodes } = useStore.getState().danmaku
  if (!isMounted || episodes?.length !== 1) {
    return false
  }
  const [mounted] = episodes
  return isSourceEpisode(mounted) && mounted.id === episode.id
}

// Wrapper around useFetchDanmaku and useMountDanmaku
export const useLoadDanmaku = () => {
  const { t } = useTranslation()

  const toast = useToast.use.toast()
  const queryClient = useQueryClient()

  const { episodes } = useStore.use.danmaku()

  const fetchMutation = useFetchDanmaku()
  const fetchGenericMutation = useFetchGenericDanmaku()
  const mountMutation = useMountDanmaku()

  const mountedEpisode = episodes?.length === 1 ? episodes[0] : undefined
  const canRefresh = useCanRefetchDanmaku(mountedEpisode)

  // Reads only what is already cached, so the toast never waits on the
  // background. A click still checks before it fetches.
  const mayRefetch = (episode: GenericEpisode): boolean => {
    if (!isSourceEpisode(episode)) {
      return false
    }
    const { queryKey } = sourceCapabilitiesQuery(
      episode.season.providerConfigId
    )
    return mayOffer(queryClient.getQueryData(queryKey), 'danmaku')
  }

  const canRefetchNow = async (episode: GenericEpisode): Promise<boolean> => {
    if (!isSourceEpisode(episode)) {
      return false
    }
    const answer = await queryClient
      .fetchQuery(sourceCapabilitiesQuery(episode.season.providerConfigId))
      .catch(() => undefined)
    return capabilitiesOf(answer).danmaku
  }

  const mountDanmaku = useEventCallback((episodes: GenericEpisode[]) => {
    return mountMutation.mutateAsync(episodes, {
      // This is called in addition to the onSuccess of mountMutation
      onSuccess: () => {
        if (episodes.length === 1) {
          const episode = episodes[0]
          toast.success(
            t(
              'danmaku.alert.mounted',
              'Danmaku Mounted: {{name}} ({{count}})',
              {
                name: episodeToString(episode),
                count: episode.commentCount,
              }
            ),
            {
              actionFn: mayRefetch(episode) ? refreshComments : undefined,
              actionLabel: t('danmaku.refresh', 'Refresh Danmaku'),
            }
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
    })
  })

  const loadMutation = useMutation({
    mutationFn: async (data: DanmakuFetchDto) => {
      return fetchMutation.mutateAsync(data, {
        onSuccess: ({ episode, keptStored }) => {
          if (keptStored && isOnlyMounted(episode)) {
            return
          }
          mountDanmaku([episode])
        },
        onError: (err) => {
          toast.error(describeSourceError(err))
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
    const episode = mountedEpisode
    if (!episode || !isSourceEpisode(episode)) {
      return
    }
    if (!(await canRefetchNow(episode))) {
      return
    }

    toast.info(t('danmaku.alert.refreshingDanmaku', 'Refreshing danmaku'))
    loadMutation.mutate(
      {
        type: 'by-meta',
        meta: episode as WithSeason<Episode>,
        options: { forceUpdate: true },
      },
      {
        onSuccess: ({ episode: refreshed, keptStored }) => {
          if (keptStored) {
            return
          }
          toast.success(
            t(
              'danmaku.alert.refreshed',
              'Danmaku Refreshed: {{name}} ({{count}})',
              {
                name: episodeToString(refreshed),
                count: refreshed.commentCount,
              }
            )
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
