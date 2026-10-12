import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { describeSourceError } from '@/common/providers/describeSourceError'
import {
  bookmarkQueryKeys,
  episodeQueryKeys,
  seasonQueryKeys,
} from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { getTrackingService } from '@/common/telemetry/getTrackingService'

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
  const { t } = useTranslation()
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
      if (!keptStored) {
        return
      }
      toast.warn(
        t(
          'danmaku.alert.refetchKeptStored',
          'Fetched {{fetched}} comments, fewer than the {{stored}} already saved. Kept the saved danmaku.',
          {
            count: keptStored.fetchedCount,
            fetched: keptStored.fetchedCount,
            stored: keptStored.storedCount,
          }
        )
      )
    },
    onError: async (error) => {
      toast.error(describeSourceError(error))
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
