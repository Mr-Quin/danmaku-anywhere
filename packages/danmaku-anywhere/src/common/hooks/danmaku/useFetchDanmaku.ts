import {
  DanDanCommentAPIParams,
  fetchComments,
} from '@danmaku-anywhere/danmaku-engine'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  DanmakuCache,
  DanmakuMeta,
  useDanmakuQuery,
} from '@/common/hooks/danmaku/useDanmakuQuery'

interface UseFetchDanmakuConfig {
  params?: Partial<DanDanCommentAPIParams>
  invalidateFn?: (danmaku: DanmakuCache) => boolean
  meta: DanmakuMeta
}

// fetch danmaku comments and cache them to some storage
export const useFetchDanmaku = ({
  params = { withRelated: true },
  meta,
}: UseFetchDanmakuConfig) => {
  const {
    danmaku,
    updateDanmaku,
    isLoading: isDbLoading,
    isFetching: isDbFetching,
    isUpdating,
  } = useDanmakuQuery(meta.episodeId)

  const query = useQuery({
    queryKey: [
      'danmaku',
      'fetch',
      {
        episodeId: meta.episodeId,
        animeId: meta.animeId,
      },
    ],
    queryFn: async () => {
      return fetchComments(meta.episodeId, params)
    },
    enabled: false,
    staleTime: Infinity,
  })

  const { data, isFetching, isFetchedAfterMount, refetch } = query

  useEffect(() => {
    // only update db if data is fetched after mount
    // if isFetchedAfterMount is false, it means the data is cached so there's no need to update db
    if (!data || !isFetchedAfterMount) return

    updateDanmaku({
      comments: data.comments,
      count: data.count,
      timeUpdated: Date.now(),
      meta,
      params,
    })
  }, [data, isFetchedAfterMount])

  const isLoading = isDbLoading || isFetching || isDbFetching || isUpdating

  return { data: danmaku, isLoading, fetch: refetch }
}
