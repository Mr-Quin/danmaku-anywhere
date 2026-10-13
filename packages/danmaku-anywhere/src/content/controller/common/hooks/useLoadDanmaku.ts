import type {
  CommentEntity,
  Episode,
  GenericEpisode,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchDto, MacCMSFetchData } from '@/common/danmaku/dto'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useFetchGenericDanmaku } from '@/common/danmaku/queries/useFetchGenericDanmaku'
import { episodeToString, isSourceEpisode } from '@/common/danmaku/utils'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { concatArr } from '@/common/utils/utils'
import { useStore } from '@/content/controller/store/store'
import { DanmakuMountError, describeMountError } from './mountError'

interface MountInput {
  episodes: GenericEpisode[]
  // The caller reports the result itself, failure included
  silent: boolean
}

const useMountDanmaku = () => {
  const { toast } = useToast()

  const { getActiveFrame, updateFrame } = useStore.use.frame()
  const { mount } = useStore.use.danmaku()

  return useMutation({
    mutationFn: async ({ episodes }: MountInput) => {
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

      // A fresh mount renders visible, so carry over a hide the user asked for.
      if (!useStore.getState().danmaku.isVisible) {
        await playerRpcClient.player['relay:command:show']({
          frameId: activeFrame.frameId,
          data: false,
        })
      }

      return activeFrame.frameId
    },
    onSuccess: (mountedFrameId, { episodes }) => {
      mount(episodes)
      updateFrame(mountedFrameId, { mounted: true })
    },
    onError: (err, { silent }) => {
      if (silent) {
        return
      }
      toast.error(describeMountError(err))
    },
  })
}

const REFRESH_TOAST_ID = 'refresh-danmaku'

interface MountDanmakuOptions {
  silent?: boolean
}

interface LoadDanmakuInput {
  request: DanmakuFetchDto
  silent?: boolean
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

  const { episodes } = useStore.use.danmaku()

  const fetchMutation = useFetchDanmaku()
  const fetchGenericMutation = useFetchGenericDanmaku()
  const mountMutation = useMountDanmaku()

  const canRefresh =
    !!episodes &&
    episodes.length === 1 &&
    isSourceEpisode(episodes[0]) &&
    episodes[0].season.manifestId === 'dandanplay'

  const describeMounted = useEventCallback(
    (episode: GenericEpisode, name?: string) => {
      const refreshable =
        isSourceEpisode(episode) && episode.season.manifestId === 'dandanplay'
      return {
        message: t(
          'danmaku.alert.mounted',
          'Mounted {{name}}: {{count}} comments',
          {
            name: name ?? episodeToString(episode),
            count: episode.commentCount,
          }
        ),
        actionFn: refreshable ? refreshComments : undefined,
        actionLabel: t('danmaku.refresh', 'Refresh Danmaku'),
      }
    }
  )

  const mountDanmaku = useEventCallback(
    (episodes: GenericEpisode[], options: MountDanmakuOptions = {}) => {
      const silent = options.silent ?? false
      return mountMutation.mutateAsync(
        { episodes, silent },
        {
          // This is called in addition to the onSuccess of mountMutation
          onSuccess: () => {
            if (silent) {
              return
            }
            if (episodes.length === 1) {
              const { message, ...action } = describeMounted(episodes[0])
              toast.success(message, action)
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
        }
      )
    }
  )

  const loadMutation = useMutation({
    mutationFn: async ({ request, silent = false }: LoadDanmakuInput) => {
      const result = await fetchMutation.mutateAsync(request)
      if (result.keptStored && isOnlyMounted(result.episode)) {
        return { ...result, mounted: false, mountError: undefined }
      }
      let mountError: unknown
      try {
        await mountDanmaku([result.episode], { silent })
      } catch (error) {
        mountError = error
      }
      return { ...result, mounted: mountError === undefined, mountError }
    },
  })

  const loadGenericMutation = useMutation({
    mutationFn: async (data: MacCMSFetchData) => {
      return fetchGenericMutation.mutateAsync(data, {
        onSuccess: (cache) => {
          mountDanmaku([cache])
        },
      })
    },
  })

  const refreshComments = useEventCallback(async () => {
    if (!canRefresh) return
    const episode = episodes[0]
    if (
      !isSourceEpisode(episode) ||
      episode.season.manifestId !== 'dandanplay'
    ) {
      return
    }

    toast.info(t('danmaku.alert.refreshingDanmaku', 'Refreshing danmaku'), {
      id: REFRESH_TOAST_ID,
      duration: null,
      loading: true,
    })
    try {
      const {
        episode: refreshed,
        keptStored,
        mountError,
      } = await loadMutation.mutateAsync({
        request: {
          type: 'by-meta',
          meta: episode as WithSeason<Episode>,
          options: { forceUpdate: true },
        },
        silent: true,
      })
      if (mountError !== undefined) {
        toast.error(describeMountError(mountError), { id: REFRESH_TOAST_ID })
        return
      }
      // useFetchDanmaku reports a kept-stored refetch and a fetch failure itself.
      if (keptStored) {
        toast.dismiss(REFRESH_TOAST_ID)
        return
      }
      toast.success(
        t('danmaku.alert.refreshed', 'Refreshed {{name}}: {{count}} comments', {
          name: episodeToString(refreshed),
          count: refreshed.commentCount,
        }),
        { id: REFRESH_TOAST_ID }
      )
    } catch {
      toast.dismiss(REFRESH_TOAST_ID)
    }
  })

  return {
    loadMutation,
    loadGenericMutation,
    refreshComments,
    canRefresh,
    mountDanmaku,
    describeMounted,
  }
}
