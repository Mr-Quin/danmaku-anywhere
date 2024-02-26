import { useStore } from '../store/store'

import type { DanmakuMeta, TitleMapping } from '@/common/db/db'
import { useFetchDanmaku } from '@/common/hooks/useFetchDanmakuCache'
import { titleMappingMessage } from '@/common/messages/titleMappingMessage'
import type { DanmakuFetchOptions } from '@/common/types/DanmakuFetchOptions'
import { tryCatch } from '@/common/utils'

export const useContentFetchDanmaku = () => {
  const { setComments, setDanmakuMeta } = useStore()

  const props = useFetchDanmaku()

  const { fetch } = props

  const handleFetch = async (
    danmakuMeta: DanmakuMeta,
    titleMapping?: TitleMapping,
    options?: DanmakuFetchOptions
  ) => {
    setDanmakuMeta(danmakuMeta)

    const res = await fetch({
      data: danmakuMeta,
      options: {
        forceUpdate: false,
        ...options,
      },
    })

    if (!res) return

    if (titleMapping) {
      await tryCatch(() => titleMappingMessage.save(titleMapping))
    }

    setComments(res.comments)
  }

  return {
    ...props,
    fetch: handleFetch,
  }
}
