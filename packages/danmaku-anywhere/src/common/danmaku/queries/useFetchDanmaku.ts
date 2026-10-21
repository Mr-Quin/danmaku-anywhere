import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/common/components/Toast/toastStore'
import { describeKeptStored } from '@/common/danmaku/describeKeptStored'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { describeSourceError } from '@/common/providers/describeSourceError'
import {
  bookmarkQueryKeys,
  episodeQueryKeys,
  seasonQueryKeys,
} from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { getTrackingService } from '@/common/telemetry/getTrackingService'

const fetchDanmakuOptions = {
  mutationFn: async (data: DanmakuFetchDto) => {
    getTrackingService().track('fetchDanmaku', data)
    const res = await chromeRpcClient.episodeFetch(data)
    return res.data
  },
  meta: {
    invalidates: [
      episodeQueryKeys.all(),
      seasonQueryKeys.all(),
      bookmarkQueryKeys.all(),
    ],
  },
}

/**
 * Fetches danmaku from cache or server
 * If not found in cache, fetches from server and saves to cache
 *
 * The background service extracts the providerInstanceId from the episode metadata
 * to determine which provider config to use.
 *
 * This is a mutation because it updates the cache
 */
export const useFetchDanmaku = () => {
  const mutation = useMutation(fetchDanmakuOptions)

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}

// For callers that show nothing of their own: reports a kept-stored refetch
// and any failure as toasts.
export const useFetchDanmakuWithToast = () => {
  const toast = useToast.use.toast()

  const mutation = useMutation({
    ...fetchDanmakuOptions,
    onSuccess: ({ keptStored }) => {
      if (keptStored) {
        toast.warn(describeKeptStored(keptStored))
      }
    },
    onError: (error) => {
      toast.error(describeSourceError(error))
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
