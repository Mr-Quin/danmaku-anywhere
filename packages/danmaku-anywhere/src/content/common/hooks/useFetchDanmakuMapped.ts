import { useMutation } from '@tanstack/react-query'

import { useStore } from '../../store/store'

import { useFetchDanmaku } from '@/common/queries/danmaku/useFetchDanmaku'
import { chromeRpcClient } from '@/common/rpc/client'
import {
  type DDPDanmakuMeta,
  type TitleMapping,
} from '@/common/types/danmaku/Danmaku'
import type { DanmakuFetchOptions } from '@/common/types/DanmakuFetchOptions'
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
