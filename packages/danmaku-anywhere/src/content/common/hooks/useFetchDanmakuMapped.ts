import type { UseMutationOptions } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import type { Danmaku } from '@/common/danmaku/models/danmaku'
import type { DanDanPlayMetaDto } from '@/common/danmaku/models/meta'
import type { TitleMapping } from '@/common/danmaku/models/titleMapping'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import type { DanmakuFetchOptions } from '@/common/danmaku/types'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { tryCatch } from '@/common/utils/utils'

interface FetchOptions {
  danmakuMeta: DanDanPlayMetaDto
  titleMapping?: TitleMapping
  options?: DanmakuFetchOptions
}

type UseFetchDanmakuMappedOptions = Partial<
  Pick<
    UseMutationOptions<Danmaku, Error, FetchOptions, void>,
    'onSuccess' | 'onError' | 'onMutate'
  >
>

export const useFetchDanmakuMapped = (
  options: UseFetchDanmakuMappedOptions = {}
) => {
  const { setComments, setDanmakuLite } = useStore()
  const toast = useToast.use.toast()

  const { mutateAsync } = useFetchDanmaku()

  const handleFetch = async ({
    danmakuMeta,
    titleMapping,
    options,
  }: FetchOptions) => {
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
      options.onMutate?.(v)
    },
    onSuccess: (cache, v) => {
      setComments(cache.comments)
      setDanmakuLite(cache)
      options.onSuccess?.(cache, v)
    },
    onError: (err, v) => {
      toast.error(err.message)
      options.onError?.(err, v)
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
