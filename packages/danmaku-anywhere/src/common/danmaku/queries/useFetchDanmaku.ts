import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchDto, KeptStored } from '@/common/danmaku/dto'
import { i18n } from '@/common/localization/i18n'
import { describeSourceError } from '@/common/providers/describeSourceError'
import {
  bookmarkQueryKeys,
  episodeQueryKeys,
  seasonQueryKeys,
} from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { getTrackingService } from '@/common/telemetry/getTrackingService'

export function describeKeptStored(keptStored: KeptStored) {
  return i18n.t(
    'danmaku.alert.refetchKeptStored',
    'Fetched {{fetched}} comments, fewer than the {{stored}} already saved. Kept the saved danmaku.',
    {
      count: keptStored.fetchedCount,
      fetched: keptStored.fetchedCount,
      stored: keptStored.storedCount,
    }
  )
}

interface FetchDanmakuOptions {
  silent?: boolean
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
export const useFetchDanmaku = ({
  silent = false,
}: FetchDanmakuOptions = {}) => {
  const toast = useToast.use.toast()

  const mutation = useMutation({
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
    onSuccess: ({ keptStored }) => {
      if (silent || !keptStored) {
        return
      }
      toast.warn(describeKeptStored(keptStored))
    },
    onError: (error) => {
      if (silent) {
        return
      }
      toast.error(describeSourceError(error))
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
