import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useSuspenseQuery } from '@tanstack/react-query'

/**
 * Fetching images from the content script has issues with the same-origin policy and images in the extension assets.
 * This hook sends the fetch task to the background script and returns the image as a base64 string.
 */
export const useImageSuspense = (src: string) => {
  return useSuspenseQuery({
    queryKey: seasonQueryKeys.image(src),
    queryFn: async () => {
      if (!src) return null
      const res = await chromeRpcClient.fetchImage(src, { silent: true })
      return res.data
    },
    staleTime: Infinity,
    retry: false,
  })
}
