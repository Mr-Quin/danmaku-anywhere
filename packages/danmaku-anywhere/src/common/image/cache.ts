import { imageDb } from '@/common/db/imageDb'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { imageQueryKeys } from '@/common/queries/queryKeys'
import { queryClient } from '@/common/queries/queryClient'

export const getCachedImage = async (src: string) => {
  if (!src) return undefined
  await imageDb.isReady
  return imageDb.image.get(src)
}

export const setCachedImage = async (src: string, dataUrl: string) => {
  await imageDb.isReady
  await imageDb.image.put({ src, dataUrl, timeUpdated: Date.now() })
}

export const fetchImageBase64 = async (src: string) => {
  const res = await chromeRpcClient.fetchImage(src, { silent: true })
  return res.data
}

export const fetchAndCacheImage = async (src: string) => {
  const dataUrl = await fetchImageBase64(src)
  await setCachedImage(src, dataUrl)
  return dataUrl
}

export const getOrFetchCachedImage = async (
  src: string,
  options?: { backgroundRefresh?: boolean }
) => {
  const shouldRefresh = options?.backgroundRefresh ?? true
  const cached = await getCachedImage(src)
  if (cached?.dataUrl) {
    if (shouldRefresh) {
      void refreshImageInBackground(src, cached.dataUrl)
    }
    return cached.dataUrl
  }
  return fetchAndCacheImage(src)
}

export const refreshImageInBackground = async (
  src: string,
  previous?: string
) => {
  try {
    const dataUrl = await fetchImageBase64(src)
    if (!previous || dataUrl !== previous) {
      await setCachedImage(src, dataUrl)
      queryClient.setQueryData(imageQueryKeys.image(src), dataUrl)
    }
  } catch (err) {
    // ignore background refresh errors
  }
}