import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/common/components/Toast/toastStore'
import type { MacCMSFetchData } from '@/common/danmaku/dto'
import {
  customEpisodeQueryKeys,
  seasonQueryKeys,
} from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

/**
 * Fetches danmaku from cache
 * If not found in cache, fetches from server and saves to cache
 *
 * This is a mutation because it updates the cache
 */
export const useFetchGenericDanmaku = () => {
  const toast = useToast.use.toast()

  return useMutation({
    mutationFn: async (data: MacCMSFetchData) => {
      const res = await chromeRpcClient.genericFetchDanmakuForUrl(data)
      return res.data
    },
    meta: {
      invalidates: [customEpisodeQueryKeys.all(), seasonQueryKeys.all()],
    },
    onError: async (error) => {
      toast.error(error.message)
    },
  })
}
