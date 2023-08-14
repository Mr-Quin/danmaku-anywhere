import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { DanmakuCache } from '@/common/hooks/danmaku/useDanmakuQuery'
import { useIndexedDBContext } from '@/common/indexedDb/IndexedDbContext'

export const useDanmakuQueryAll = () => {
  const { db, getAll } = useIndexedDBContext()

  const { data, ...query } = useQuery({
    queryKey: ['indexeddb', 'danmaku', 'all'],
    queryFn: async () => {
      return getAll()
    },
    enabled: db !== null,
    placeholderData: [],
  })

  const select = useCallback(
    (episodeId: number) => {
      return data?.find((item) => item.meta.episodeId === episodeId)
    },
    [data]
  )

  // since placeholderData is set to [], data will never be undefined unless the query fails,
  // which should not happen since we are querying against indexeddb
  return {
    data: data as DanmakuCache[],
    ...query,
    select,
  }
}
