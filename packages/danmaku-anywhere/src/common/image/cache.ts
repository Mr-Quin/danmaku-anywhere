import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const fetchImageBase64 = async (src: string) => {
  const res = await chromeRpcClient.fetchImage(
    { src, options: { cache: false } },
    { silent: true }
  )
  return res.data
}

export const getOrFetchCachedImage = async (
  src: string,
  options?: { backgroundRefresh?: boolean }
) => {
  const res = await chromeRpcClient.fetchImage(
    {
      src,
      options: { cache: true, backgroundRefresh: options?.backgroundRefresh },
    },
    { silent: true }
  )
  return res.data
}
