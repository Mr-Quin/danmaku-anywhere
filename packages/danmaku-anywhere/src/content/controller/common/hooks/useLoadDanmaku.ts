import type {
  Episode,
  GenericEpisode,
} from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type {
  DanmakuFetchDto,
  DanmakuFetchResult,
  MacCMSFetchData,
} from '@/common/danmaku/dto'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useFetchGenericDanmaku } from '@/common/danmaku/queries/useFetchGenericDanmaku'
import { isSourceEpisode } from '@/common/danmaku/utils'
import {
  type MountResult,
  sendMount,
} from '@/content/controller/common/danmakuCommands'
import { useStore } from '@/content/controller/store/store'
import { describeMountError } from './mountError'
import {
  isRefreshable,
  type LoadOutcome,
  type OutcomeMessage,
  useDescribeOutcome,
} from './useDescribeOutcome'

const REFRESH_TOAST_ID = 'refresh-danmaku'

interface LoadDanmakuInput {
  request: DanmakuFetchDto
  signal?: AbortSignal
}

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

function providerConfigIdOf(request: DanmakuFetchDto) {
  return request.type === 'by-meta'
    ? request.meta.season.providerConfigId
    : undefined
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

/**
 * Fetches and mounts danmaku in the active frame. `mount` and `loadMutation`
 * only report an outcome; `mountChosen` and `load` are for danmaku the user
 * picked, so they take over from automatic matching and show the outcome.
 */
export const useLoadDanmaku = () => {
  const { t } = useTranslation()

  const toast = useToast.use.toast()
  const enqueue = useToast.use.enqueue()
  const describeOutcome = useDescribeOutcome()

  const { episodes } = useStore.use.danmaku()

  const fetchMutation = useFetchDanmaku()
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

  const mount = useEventCallback(
    (
      episodes: GenericEpisode[],
      { signal }: { signal?: AbortSignal } = {}
    ): Promise<MountResult> => {
      return mountMutation.mutateAsync({ episodes, signal })
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
        return {
          status: 'fetchFailed',
          error,
          providerConfigId: providerConfigIdOf(request),
        }
      }
      const { episode, keptStored } = fetched
      if (signal?.aborted) {
        return { status: 'cancelled' }
      }
      if (keptStored && isOnlyMounted(episode)) {
        return { status: 'unchanged', keptStored }
      }
      try {
        const result = await mount([episode], { signal })
        if (result.status === 'cancelled') {
          return { status: 'cancelled' }
        }
      } catch (error) {
        return { status: 'mountFailed', error }
      }
      return { status: 'mounted', episode }
    },
  })

  const show = (
    described: OutcomeMessage | undefined,
    options: { id?: string } = {}
  ) => {
    if (!described) {
      if (options.id) {
        toast.dismiss(options.id)
      }
      return
    }
    enqueue({
      severity: described.severity,
      message: described.message,
      ...described.action,
      ...options,
    })
  }

  const mountChosen = useEventCallback(async (episodes: GenericEpisode[]) => {
    useStore.getState().integration.preemptAutomatic()
    try {
      await mount(episodes)
    } catch (error) {
      toast.error(describeMountError(error))
      throw error
    }
    if (episodes.length === 1) {
      show(
        describeOutcome(
          { status: 'mounted', episode: episodes[0] },
          { onRefresh: refreshFromToast }
        )
      )
      return
    }
    toast.success(
      t('danmaku.alert.mountedMultiple', 'Mounted {{count}} selected danmaku', {
        count: episodes.length,
      })
    )
  })

  const load = useEventCallback(async (request: DanmakuFetchDto) => {
    useStore.getState().integration.preemptAutomatic()
    const outcome = await loadMutation.mutateAsync({ request })
    show(describeOutcome(outcome, { onRefresh: refreshFromToast }))
    return outcome
  })

  const loadGenericMutation = useMutation({
    mutationFn: async (data: MacCMSFetchData) => {
      return fetchGenericMutation.mutateAsync(data, {
        onSuccess: (cache) => {
          void mountChosen([cache])
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
      if (!isSourceEpisode(episode)) {
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
        show(describeOutcome(outcome, { refreshed: true }), {
          id: REFRESH_TOAST_ID,
        })
      } finally {
        refresh.stop()
      }
    }
  )

  const refreshFromToast = () => {
    void refreshComments()
  }

  return {
    loadMutation,
    load,
    loadGenericMutation,
    refreshComments,
    canRefresh,
    mount,
    mountChosen,
  }
}
