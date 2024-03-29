import { useMutation } from '@tanstack/react-query'

import { useStore } from '../store/store'

import type { DanmakuMeta, TitleMapping } from '@/common/db/db'
import { danmakuMessage } from '@/common/messages/danmakuMessage'
import { titleMappingMessage } from '@/common/messages/titleMappingMessage'
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
    setDanmakuMeta(danmakuMeta)

    const res = await danmakuMessage.fetch({
      data: danmakuMeta,
      options: {
        forceUpdate: false,
        ...options,
      },
    })

    if (titleMapping) {
      await tryCatch(() => titleMappingMessage.save(titleMapping))
    }

    return res.comments
  }

  const mutation = useMutation({
    mutationFn: handleFetch,
    onSuccess: (comments) => {
      setComments(comments)
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
