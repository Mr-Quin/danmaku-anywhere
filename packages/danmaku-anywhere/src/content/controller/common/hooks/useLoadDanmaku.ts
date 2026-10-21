import type {
  Episode,
  GenericEpisode,
} from '@danmaku-anywhere/danmaku-converter'
import { useEventCallback } from '@mui/material'
import { useIsMutating, useMutation } from '@tanstack/react-query'
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
import { useCanRefetchDanmaku } from '@/common/providers/useSourceCapabilities'
import {
  type MountResult,
  sendMount,
} from '@/content/controller/common/danmakuCommands'
import type { LoadOutcome } from '@/content/controller/common/outcomes'
import { preemptAutomatic } from '@/content/controller/store/automaticPreemption'
import { useStore } from '@/content/controller/store/store'
import { describeMountError } from './mountError'
import { type OutcomeMessage, useDescribeOutcome } from './useDescribeOutcome'

const REFRESH_TOAST_ID = 'refresh-danmaku'
// Every caller shares the refresh toast, so only the refresh started last may
// update or dismiss it.
let lastRefresh = 0
const LOAD_MUTATION_KEY = ['danmaku', 'load']

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

// Aborts once something other than this episode is mounted. The refresh's
// own mount replaces the episode with the refreshed copy, which keeps it.
function followMountedEpisode(
  episode: Episode,
  signal: AbortSignal | undefined
) {
  const controller = new AbortController()
  const abort = () => {
    controller.abort()
  }
  signal?.addEventListener('abort', abort, { once: true })
  const unsubscribe = useStore.subscribe((state, prev) => {
    if (
      state.danmaku.episodes !== prev.danmaku.episodes &&
      !isOnlyMounted(episode)
    ) {
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

  // A mutation, so the floating button's loading indicator covers mounts.
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

  const isLoading = useIsMutating({ mutationKey: LOAD_MUTATION_KEY }) > 0

  const mountedEpisode = episodes?.length === 1 ? episodes[0] : undefined
  const canRefresh = useCanRefetchDanmaku(mountedEpisode)

  const mount = useEventCallback(
    (
      episodes: GenericEpisode[],
      { signal }: { signal?: AbortSignal } = {}
    ): Promise<MountResult> => {
      return mountMutation.mutateAsync({ episodes, signal })
    }
  )

  const mountOutcome = useEventCallback(
    async (
      episode: GenericEpisode,
      signal?: AbortSignal
    ): Promise<LoadOutcome> => {
      try {
        const result = await mount([episode], { signal })
        if (result.status === 'cancelled') {
          return result
        }
      } catch (error) {
        return { status: 'mountFailed', error }
      }
      return { status: 'mounted', episode }
    }
  )

  const loadMutation = useMutation({
    mutationKey: LOAD_MUTATION_KEY,
    mutationFn: async ({
      request,
      signal,
    }: LoadDanmakuInput): Promise<LoadOutcome> => {
      let fetched: DanmakuFetchResult
      try {
        fetched = await fetchMutation.mutateAsync(request)
      } catch (error) {
        if (signal?.aborted) {
          return { status: 'cancelled' }
        }
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
      return mountOutcome(episode, signal)
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
    preemptAutomatic()
    let result: MountResult
    try {
      result = await mount(episodes)
    } catch (error) {
      toast.error(describeMountError(error))
      return
    }
    if (result.status !== 'mounted') {
      return
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
    preemptAutomatic()
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

  const refreshComments = useEventCallback(
    async ({ signal }: RefreshOptions = {}) => {
      if (!canRefresh || signal?.aborted) {
        return
      }
      const episode = mountedEpisode
      if (!episode || !isSourceEpisode(episode)) {
        return
      }

      const refreshNumber = ++lastRefresh
      toast.info(t('danmaku.alert.refreshingDanmaku', 'Refreshing danmaku'), {
        id: REFRESH_TOAST_ID,
        duration: null,
        loading: true,
      })
      const refresh = followMountedEpisode(episode, signal)
      try {
        const outcome = await loadMutation.mutateAsync({
          request: {
            type: 'by-meta',
            meta: episode,
            options: { forceUpdate: true },
          },
          signal: refresh.signal,
        })
        if (refreshNumber !== lastRefresh) {
          return
        }
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
    isLoading,
    load,
    loadGenericMutation,
    refreshComments,
    canRefresh,
    mount,
    mountOutcome,
    mountChosen,
  }
}
