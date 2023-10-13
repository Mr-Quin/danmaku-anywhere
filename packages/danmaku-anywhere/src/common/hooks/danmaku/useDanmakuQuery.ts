import {
  DanDanComment,
  DanDanCommentAPIParams,
} from '@danmaku-anywhere/danmaku-engine'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/common/db'

export interface DanmakuMeta {
  episodeId: number
  animeId: number
  episodeTitle: string
  animeTitle: string
}

export interface DanmakuCache {
  comments: DanDanComment[]
  count: number
  meta: DanmakuMeta
  params: Partial<DanDanCommentAPIParams>
  timeUpdated: number
  version: number
}

export const useDanmakuQuery = (episodeId?: number) => {
  const dbReady = useLiveQuery(() => db.isOpen())

  const queryClient = useQueryClient()

  const queryKey = ['indexeddb', 'danmaku', episodeId]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await db.dandanplay.get(episodeId!)
      if (!result) {
        return null
      }
      return result
    },
    initialData: () => {
      // look for the danmaku in the all danmaku cache if it exists
      const allDanmaku = queryClient.getQueryData<DanmakuCache[]>([
        'indexeddb',
        'danmaku',
        'all',
      ])

      return allDanmaku?.find(
        (item: DanmakuCache) => item.meta.episodeId === episodeId
      )
    },
    enabled: dbReady && episodeId !== undefined,
  })

  const updateMutation = useMutation({
    mutationFn: async (danmaku: Omit<DanmakuCache, 'version'>) => {
      const existing = await db.dandanplay.get(danmaku.meta.episodeId)
      const update: DanmakuCache = {
        ...danmaku,
        version: existing ? existing.version + 1 : 1,
      }
      await db.dandanplay.update(danmaku.meta.episodeId, update)
      return update
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (episodeId: number) => {
      await db.dandanplay.delete(episodeId)
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKey, null)
    },
  })

  return {
    danmaku: query.data,
    updateDanmaku: updateMutation.mutateAsync,
    deleteDanmaku: deleteMutation.mutateAsync,
    reload: query.refetch,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    ...query,
  }
}
