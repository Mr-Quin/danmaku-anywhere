import { useMutation } from '@tanstack/react-query'

import { useStore } from '../../store/store'

import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import type {
  DanmakuFetchOptions,
  DDPDanmakuMeta,
  TitleMapping,
} from '@/common/danmaku/types/types'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { tryCatch } from '@/common/utils/utils'

export const useFetchDanmakuMapped = () => {
  const { setComments, setDanmakuMeta } = useStore()

  const { mutateAsync } = useFetchDanmaku()

  const handleFetch = async ({
    danmakuMeta,
    titleMapping,
    options,
  }: {
    danmakuMeta: DDPDanmakuMeta
    titleMapping?: TitleMapping
    options?: DanmakuFetchOptions
  }) => {
    const res = await mutateAsync({
      meta: danmakuMeta,
      options: {
        forceUpdate: false,
        ...options,
      },
    })

    if (titleMapping) {
      await tryCatch(() => chromeRpcClient.titleMappingSet(titleMapping))
    }

    return res
  }

  const mutation = useMutation({
    mutationFn: handleFetch,
    onMutate: (v) => {
      setDanmakuMeta(v.danmakuMeta)
    },
    onSuccess: (cache) => {
      setComments(cache.comments)
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
