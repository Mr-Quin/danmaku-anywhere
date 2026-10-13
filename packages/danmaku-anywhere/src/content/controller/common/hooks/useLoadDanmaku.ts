import type {
  Episode,
  GenericEpisode,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type {
  DanmakuFetchDto,
  DanmakuFetchResult,
  KeptStored,
  MacCMSFetchData,
} from '@/common/danmaku/dto'
import {
  describeKeptStored,
  useFetchDanmaku,
} from '@/common/danmaku/queries/useFetchDanmaku'
import { useFetchGenericDanmaku } from '@/common/danmaku/queries/useFetchGenericDanmaku'
import { episodeToString, isSourceEpisode } from '@/common/danmaku/utils'
import { describeSourceError } from '@/common/providers/describeSourceError'
import {
  type MountResult,
  sendMount,
} from '@/content/controller/common/danmakuCommands'
import { useStore } from '@/content/controller/store/store'
import { describeMountError } from './mountError'

const REFRESH_TOAST_ID = 'refresh-danmaku'

interface MountDanmakuOptions {
  silent?: boolean
  signal?: AbortSignal
}

interface LoadDanmakuInput {
  request: DanmakuFetchDto
  signal?: AbortSignal
}

export type LoadOutcome =
  | { status: 'mounted'; episode: WithSeason<Episode>; keptStored?: KeptStored }
  // The refetch came back with fewer comments, and the stored episode is
  // already the one mounted.
  | {
      status: 'unchanged'
      episode: WithSeason<Episode>
      keptStored: KeptStored
    }
  | { status: 'cancelled' }
  | { status: 'fetchFailed'; error: unknown }
  | { status: 'mountFailed'; episode: WithSeason<Episode>; error: unknown }

interface RefreshOptions {
  signal?: AbortSignal
}

function isOnlyMounted(episode: Episode): boolean {
  const { isMounted, episodes } = useStore.getState().danmaku
  if (!isMounted || episodes?.length !== 1) {
    return false
  }
  const [mounted] = episodes
  return isSourceEpisode(mounted) && mounted.id === episode.id
}

function isRefreshable(episode: GenericEpisode) {
  return isSourceEpisode(episode) && episode.season.manifestId === 'dandanplay'
}

// Aborts when the caller's signal does or when the mounted episodes change.
function followMountedEpisodes(signal: AbortSignal | undefined) {
  const controller = new AbortController()
  const abort = () => {
    controller.abort()
  }
  signal?.addEventListener('abort', abort, { once: true })
  const unsubscribe = useStore.subscribe((state, prev) => {
    if (state.danmaku.episodes !== prev.danmaku.episodes) {
      abort()
    }
  })
  return {
    signal: controller.signal,
    stop: () => {
      signal?.removeEventListener('abort', abort)
      unsubscribe()
    },
  }
}

// Wrapper around useFetchDanmaku and the player mount command
export const useLoadDanmaku = () => {
  const { t } = useTranslation()

  const toast = useToast.use.toast()

  const { episodes } = useStore.use.danmaku()

  const fetchMutation = useFetchDanmaku({ silent: true })
  const fetchGenericMutation = useFetchGenericDanmaku()
  const mountMutation = useMutation({
    mutationFn: ({
      episodes,
      signal,
    }: {
      episodes: GenericEpisode[]
      signal?: AbortSignal
    }) => {
      return sendMount(episodes, signal)
    },
  })

  const canRefresh =
    !!episodes && episodes.length === 1 && isRefreshable(episodes[0])

  const describeMounted = useEventCallback(
    (
      episode: GenericEpisode,
      { name, signal }: { name?: string; signal?: AbortSignal } = {}
    ) => {
      return {
        message: t(
          'danmaku.alert.mounted',
          'Mounted {{name}}: {{count}} comments',
          {
            name: name ?? episodeToString(episode),
            count: episode.commentCount,
          }
        ),
        actionFn: isRefreshable(episode)
          ? () => {
              void refreshComments({ signal })
            }
          : undefined,
        actionLabel: t('danmaku.refresh', 'Refresh Danmaku'),
      }
    }
  )

  const mountDanmaku = useEventCallback(
    async (
      episodes: GenericEpisode[],
      { silent = false, signal }: MountDanmakuOptions = {}
    ): Promise<MountResult> => {
      let result: MountResult
      try {
        result = await mountMutation.mutateAsync({ episodes, signal })
      } catch (error) {
        if (!silent) {
          toast.error(describeMountError(error))
        }
        throw error
      }
      if (silent || result.status !== 'mounted') {
        return result
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
      return result
    }
  )

  const loadMutation = useMutation({
    mutationFn: async ({
      request,
      signal,
    }: LoadDanmakuInput): Promise<LoadOutcome> => {
      let fetched: DanmakuFetchResult
      try {
        fetched = await fetchMutation.mutateAsync(request)
      } catch (error) {
        return { status: 'fetchFailed', error }
      }
      const { episode, keptStored } = fetched
      if (signal?.aborted) {
        return { status: 'cancelled' }
      }
      if (keptStored && isOnlyMounted(episode)) {
        return { status: 'unchanged', episode, keptStored }
      }
      try {
        const mounted = await mountDanmaku([episode], { silent: true, signal })
        if (mounted.status === 'cancelled') {
          return { status: 'cancelled' }
        }
      } catch (error) {
        return { status: 'mountFailed', episode, error }
      }
      return { status: 'mounted', episode, keptStored }
    },
  })

  // Loads and mounts what the user picked, reporting the outcome as toasts.
  const load = useEventCallback(async (request: DanmakuFetchDto) => {
    const outcome = await loadMutation.mutateAsync({ request })
    switch (outcome.status) {
      case 'fetchFailed':
        toast.error(describeSourceError(outcome.error))
        break
      case 'mountFailed':
        toast.error(describeMountError(outcome.error))
        break
      case 'unchanged':
        toast.warn(describeKeptStored(outcome.keptStored))
        break
      case 'mounted': {
        if (outcome.keptStored) {
          toast.warn(describeKeptStored(outcome.keptStored))
        }
        const { message, ...action } = describeMounted(outcome.episode)
        toast.success(message, action)
        break
      }
    }
    return outcome
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

  // Refetches the one mounted episode. It gives up when the caller's signal
  // aborts or something else changes what is mounted first.
  const refreshComments = useEventCallback(
    async ({ signal }: RefreshOptions = {}) => {
      if (!canRefresh || signal?.aborted) {
        return
      }
      const episode = episodes[0]
      if (!isSourceEpisode(episode) || !isRefreshable(episode)) {
        return
      }

      toast.info(t('danmaku.alert.refreshingDanmaku', 'Refreshing danmaku'), {
        id: REFRESH_TOAST_ID,
        duration: null,
        loading: true,
      })
      const refresh = followMountedEpisodes(signal)
      try {
        const outcome = await loadMutation.mutateAsync({
          request: {
            type: 'by-meta',
            meta: episode,
            options: { forceUpdate: true },
          },
          signal: refresh.signal,
        })
        switch (outcome.status) {
          case 'cancelled':
            toast.dismiss(REFRESH_TOAST_ID)
            break
          case 'fetchFailed':
            toast.error(describeSourceError(outcome.error), {
              id: REFRESH_TOAST_ID,
            })
            break
          case 'mountFailed':
            toast.error(describeMountError(outcome.error), {
              id: REFRESH_TOAST_ID,
            })
            break
          case 'unchanged':
            toast.warn(describeKeptStored(outcome.keptStored), {
              id: REFRESH_TOAST_ID,
            })
            break
          case 'mounted':
            toast.success(
              t(
                'danmaku.alert.refreshed',
                'Refreshed {{name}}: {{count}} comments',
                {
                  name: episodeToString(outcome.episode),
                  count: outcome.episode.commentCount,
                }
              ),
              { id: REFRESH_TOAST_ID }
            )
            break
        }
      } finally {
        refresh.stop()
      }
    }
  )

  return {
    loadMutation,
    load,
    loadGenericMutation,
    refreshComments,
    canRefresh,
    mountDanmaku,
    describeMounted,
  }
}
