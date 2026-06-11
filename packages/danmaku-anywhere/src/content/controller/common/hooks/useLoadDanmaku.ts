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
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useFetchGenericDanmaku } from '@/common/danmaku/queries/useFetchGenericDanmaku'
import { episodeToString, isProvider } from '@/common/danmaku/utils'
import { useInjectService } from '@/common/hooks/useInjectService'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { DanmakuMountMode } from '@/common/telemetry/events'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { concatArr } from '@/common/utils/utils'
import { useStore } from '@/content/controller/store/store'

interface MountVariables {
  episodes: GenericEpisode[]
  mode: DanmakuMountMode
}

const useMountDanmaku = () => {
  const { toast } = useToast()

  const { getActiveFrame, updateFrame } = useStore.use.frame()
  const { mount } = useStore.use.danmaku()
  const providerConfigService = useInjectService(ProviderConfigService)

  return useMutation({
    mutationFn: async ({ episodes }: MountVariables) => {
      const activeFrame = getActiveFrame()
      if (!activeFrame) {
        throw new Error('No active frame to mount danmaku')
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
        throw new Error('Failed to mount danmaku')
      }

      return activeFrame.frameId
    },
    onSuccess: async (mountedFrameId, { episodes, mode }) => {
      mount(episodes)
      updateFrame(mountedFrameId, { mounted: true })

      const firstEpisode = episodes[0]
      if (!firstEpisode) {
        return
      }
      const commentCount = episodes.reduce(
        (sum, episode) => sum + episode.commentCount,
        0
      )
      // Provider episodes carry the season's config id; map it to the manifest
      // so custom providers (which share one source type) stay distinguishable.
      // Local imports have no season, hence no manifest.
      const providerConfigId =
        'season' in firstEpisode ? firstEpisode.season.providerConfigId : null
      const config = providerConfigId
        ? await providerConfigService.get(providerConfigId)
        : null
      getTrackingService().track('danmakuMount', {
        mode,
        manifestId: config?.manifestId ?? null,
        commentCount,
      })
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

  const mountDanmaku = useEventCallback(
    (episodes: GenericEpisode[], mode: DanmakuMountMode = 'manual') => {
      return mountMutation.mutateAsync(
        { episodes, mode },
        {
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
                  actionFn: isProvider(episode, DanmakuSourceType.DanDanPlay)
                    ? refreshComments
                    : undefined,
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
        }
      )
    }
  )

  const loadMutation = useMutation({
    mutationFn: async ({
      mode = 'manual',
      ...data
    }: DanmakuFetchDto & { mode?: DanmakuMountMode }) => {
      return fetchMutation.mutateAsync(data as DanmakuFetchDto, {
        onSuccess: (cache) => {
          mountDanmaku([cache], mode)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      })
    },
  })

  const loadGenericMutation = useMutation({
    mutationFn: async ({
      mode = 'manual',
      ...data
    }: MacCMSFetchData & { mode?: DanmakuMountMode }) => {
      return fetchGenericMutation.mutateAsync(data as MacCMSFetchData, {
        onSuccess: (cache) => {
          mountDanmaku([cache], mode)
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
    if (!isProvider(episode, DanmakuSourceType.DanDanPlay)) return

    toast.info(t('danmaku.alert.refreshingDanmaku', 'Refreshing danmaku'))
    loadMutation.mutate(
      {
        type: 'by-meta',
        meta: episode as WithSeason<Episode>,
        options: { forceUpdate: true },
      },
      {
        onSuccess: (result) => {
          toast.success(
            t(
              'danmaku.alert.refreshed',
              'Danmaku Refreshed: {{name}} ({{count}})',
              {
                name: episodeToString(result),
                count: result.commentCount,
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
