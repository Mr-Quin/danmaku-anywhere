import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useStore } from '../../store/store'

import type { DanmakuMeta, TitleMapping } from '@/common/db/db'
import { useAllDanmakuQuerySuspense } from '@/common/hooks/useAllDanmakuQuerySuspense'
import { useDanmakuQuerySuspense } from '@/common/hooks/useDanmakuQuerySuspense'
import { chromeRpcClient } from '@/common/rpc/client'
import type { DanmakuFetchOptions } from '@/common/types/DanmakuFetchOptions'
import { tryCatch } from '@/common/utils'

export const useFetchDanmakuMutation = () => {
  const { setComments, setDanmakuMeta } = useStore()

  const handleFetch = async ({
    danmakuMeta,
    titleMapping,
    options,
  }: {
    danmakuMeta: DanmakuMeta
    titleMapping?: TitleMapping
    options?: DanmakuFetchOptions
  }) => {
    const res = await chromeRpcClient.danmakuFetch({
      data: danmakuMeta,
      options: {
        forceUpdate: false,
        ...options,
      },
    })

    if (titleMapping) {
      await tryCatch(() => chromeRpcClient.titleMappingSet(titleMapping))
    }

    return res.comments
  }

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: handleFetch,
    onMutate: (v) => {
      setDanmakuMeta(v.danmakuMeta)
    },
    onSuccess: (comments, v) => {
      setComments(comments)
      queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: useDanmakuQuerySuspense.queryKey(v.danmakuMeta.episodeId),
      })
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
