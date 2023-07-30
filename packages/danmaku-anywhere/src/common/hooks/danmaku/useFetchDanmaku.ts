import {
  DanDanCommentAPIParams,
  fetchComments,
} from '@danmaku-anywhere/danmaku-engine'
import { useCallback, useState } from 'react'
import {
  DanmakuCache,
  DanmakuMeta,
  useLocalDanmaku,
} from '@/common/hooks/danmaku/useLocalDanmaku'

interface UseFetchDanmakuConfig {
  params?: Partial<DanDanCommentAPIParams>
  invalidateFn?: (danmaku: DanmakuCache) => boolean
}

// fetch danmaku comments and cache them to chrome local storage
export const useFetchDanmaku = (
  meta?: DanmakuMeta,
  { params = {}, invalidateFn }: UseFetchDanmakuConfig = {}
) => {
  const episodeId = meta?.episodeId

  const { danmaku, updateDanmaku } = useLocalDanmaku(episodeId)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const invalidate = useCallback(() => {
    if (!danmaku) return true
    if (!invalidateFn) return false
    return invalidateFn(danmaku)
  }, [invalidateFn, danmaku])

  const handleFetchComments = async (ignoreInvalidation = false) => {
    if (!episodeId || !meta) return
    if (!ignoreInvalidation) {
      if (!invalidate()) return
    }
    setIsLoading(true)
    setIsSuccess(false)

    try {
      const result = await fetchComments(episodeId, params)
      console.log('fetched danmaku', result)
      if (result.count > 0) {
        // cache the comments
        await updateDanmaku(episodeId, {
          comments: result.comments,
          count: result.count,
          timeUpdated: Date.now(),
          meta,
          params,
          version: danmaku?.version ? danmaku.version + 1 : 1,
          schemaVersion: 1,
        })
      }
      setIsSuccess(true)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = async () => {
    await handleFetchComments(true)
  }

  return { danmaku, isLoading, isSuccess, fetch: refetch }
}
