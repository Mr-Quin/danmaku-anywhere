import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { imageQueryKeys } from '@/common/queries/queryKeys'
import { getOrFetchCachedImage, fetchImageBase64 } from '@/common/image/cache'

/**
 * Fetching images from the content script has issues with the same-origin policy and images in the extension assets.
 * This hook sends the fetch task to the background script and returns the image as a base64 string.
 */
export const useImageSuspense = (
  src: string,
  options?: { cache?: boolean }
) => {
  const useCache = options?.cache !== false
  return useSuspenseQuery({
    queryKey: imageQueryKeys.image(src),
    queryFn: async () => {
      if (!src) return null
      if (useCache) {
        return getOrFetchCachedImage(src)
      }
      return fetchImageBase64(src)
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}

export const useImage = (src: string, options?: { cache?: boolean }) => {
  const useCache = options?.cache !== false
  return useQuery({
    queryKey: imageQueryKeys.image(src),
    queryFn: async () => {
      if (!src) return null
      if (useCache) {
        return getOrFetchCachedImage(src)
      }
      return fetchImageBase64(src)
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}
