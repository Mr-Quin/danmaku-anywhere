import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { DanmakuCache } from '@/common/hooks/danmaku/useDanmakuQuery'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/common/db'

export const useDanmakuQueryAll = () => {
  const dbOpen = useLiveQuery(() => db.isOpen())

  const { data, ...query } = useQuery({
    queryKey: ['indexeddb', 'danmaku', 'all'],
    queryFn: async () => {
      return db.dandanplay.toArray()
    },
    enabled: dbOpen,
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
