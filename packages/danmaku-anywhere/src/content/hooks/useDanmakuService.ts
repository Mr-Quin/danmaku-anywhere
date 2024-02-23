import { useStore } from '../store/store'

import { DanmakuFetchOptions } from '@/background/services/DanmakuService'
import { DanmakuMeta, TitleMapping } from '@/common/db/db'
import { titleMappingMessage } from '@/common/messages/titleMappingMessage'
import { tryCatch } from '@/common/utils'
import { useFetchDanmaku } from '@/popup/hooks/useFetchDanmaku'

export const useDanmakuService = () => {
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
