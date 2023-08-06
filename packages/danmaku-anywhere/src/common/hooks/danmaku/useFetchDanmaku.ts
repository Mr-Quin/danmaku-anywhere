import {
  DanDanCommentAPIParams,
  DanDanCommentAPIResult,
  fetchComments,
} from '@danmaku-anywhere/danmaku-engine'
import { useCallback } from 'react'
import {
  DanmakuCache,
  DanmakuMeta,
  useDanmakuDb,
} from '@/common/hooks/danmaku/useDanmakuDb'
import { useAsyncLifecycle } from '@/common/hooks/useAsyncLifecycle'
import { popupLogger } from '@/common/logger'

interface UseFetchDanmakuConfig {
  params?: Partial<DanDanCommentAPIParams>
  invalidateFn?: (danmaku: DanmakuCache) => boolean
}

// fetch danmaku comments and cache them to some storage
export const useFetchDanmaku = ({
  params = { withRelated: true },
  invalidateFn,
}: UseFetchDanmakuConfig = {}) => {
  const {
    selectDanmaku,
    updateDanmaku,
    isLoading: isLocalDanmakuLoading,
  } = useDanmakuDb()

  const [{ isLoading: isFetchLoading, isSuccess }, dispatch] =
    useAsyncLifecycle<DanDanCommentAPIResult>()

  const isLoading = isLocalDanmakuLoading || isFetchLoading

  const invalidate = useCallback(
    (danmaku?: DanmakuCache) => {
      if (!danmaku || !invalidateFn) return true
      return invalidateFn(danmaku)
    },
    [invalidateFn]
  )

  const handleFetchComments = async (meta: DanmakuMeta) => {
    if (isLoading) return

    const { episodeId } = meta

    const danmaku = selectDanmaku(episodeId)

    if (!invalidate(danmaku)) return

    dispatch({ type: 'LOADING' })
    try {
      const result = await fetchComments(episodeId, params)
      popupLogger.log('fetched danmaku', result)
      if (result.count > 0) {
        // cache the comments
        await updateDanmaku(episodeId, {
          comments: result.comments,
          count: result.count,
          timeUpdated: Date.now(),
          meta,
          params,
          version: danmaku?.version ? danmaku.version + 1 : 1,
        })
      }
      dispatch({ type: 'SET', payload: result })
    } catch (e) {
      popupLogger.error(e)
      dispatch({ type: 'ERROR', payload: e })
    }
  }

  return { isLoading, isSuccess, fetch: handleFetchComments }
}
