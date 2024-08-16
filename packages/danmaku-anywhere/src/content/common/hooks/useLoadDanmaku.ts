import type { UseMutationOptions } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchContext } from '@/common/danmaku/dto'
import type { Danmaku } from '@/common/danmaku/models/danmaku'
import type { DanDanPlayMetaDto } from '@/common/danmaku/models/meta'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import type { DanmakuFetchOptions } from '@/common/danmaku/types'

interface FetchOptions {
  danmakuMeta: DanDanPlayMetaDto
  context?: DanmakuFetchContext
  options?: DanmakuFetchOptions
}

type UseFetchDanmakuMappedOptions = Partial<
  Pick<
    UseMutationOptions<Danmaku, Error, FetchOptions, void>,
    'onSuccess' | 'onError' | 'onMutate'
  >
>

export const useLoadDanmaku = (options: UseFetchDanmakuMappedOptions = {}) => {
  const { setComments, setDanmakuLite } = useStore()
  const toast = useToast.use.toast()

  const { mutateAsync } = useFetchDanmaku()

  const handleFetch = async ({
    danmakuMeta,
    context,
    options,
  }: FetchOptions) => {
    const res = await mutateAsync(
      {
        meta: danmakuMeta,
        options: {
          forceUpdate: false,
          ...options,
        },
        context,
      },
      {
        onSuccess: (cache) => {
          setComments(cache.comments)
          setDanmakuLite(cache)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      }
    )

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
