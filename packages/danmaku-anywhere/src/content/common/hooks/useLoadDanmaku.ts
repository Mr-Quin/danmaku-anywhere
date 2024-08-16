import { useMutation } from '@tanstack/react-query'

import { useStore } from '../../store/store'

import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuFetchContext } from '@/common/danmaku/dto'
import type { DanDanPlayMetaDto } from '@/common/danmaku/models/meta'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import type { DanmakuFetchOptions } from '@/common/danmaku/types'

interface FetchOptions {
  danmakuMeta: DanDanPlayMetaDto
  context?: DanmakuFetchContext
  options?: DanmakuFetchOptions
}

export const useLoadDanmaku = () => {
  const { setComments, setDanmakuLite } = useStore()
  const toast = useToast.use.toast()

  const fetchMutation = useFetchDanmaku()

  const load = async ({ danmakuMeta, context, options }: FetchOptions) => {
    const res = await fetchMutation.mutateAsync(
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

  return useMutation({
    mutationFn: load,
  })
}
