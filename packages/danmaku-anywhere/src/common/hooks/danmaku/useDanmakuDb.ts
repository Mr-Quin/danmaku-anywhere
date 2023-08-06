import {
  DanDanComment,
  DanDanCommentAPIParams,
} from '@danmaku-anywhere/danmaku-engine'
import { useCallback, useEffect } from 'react'
import { useAsyncLifecycle } from '@/common/hooks/useAsyncLifecycle'
import { useIndexedDBContext } from '@/common/indexedDb/IndexedDbContext'

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

export const useDanmakuDb = () => {
  const { db, getAll, set, remove, subscribe } = useIndexedDBContext()

  const [state, dispatch] = useAsyncLifecycle<DanmakuCache[]>([])

  const allDanmaku = state.data ?? []

  const getAllDanmaku = useCallback(async () => {
    if (!db) return
    dispatch({
      type: 'LOADING',
    })
    const result = await getAll()
    dispatch({
      type: 'SET',
      payload: result,
    })
    // setAllDanmaku(result)
    return result
  }, [db, getAll, dispatch])

  const selectDanmaku = useCallback(
    (episodeId: number) => {
      return allDanmaku.find((danmaku) => danmaku.meta.episodeId === episodeId)
    },
    [allDanmaku]
  )

  useEffect(() => {
    getAllDanmaku()
  }, [getAllDanmaku])

  useEffect(() => {
    if (subscribe) {
      return subscribe((danmakuArray) => {
        dispatch({
          type: 'SET',
          payload: danmakuArray,
        })
        // setAllDanmaku(danmakuArray)
      })
    }
  }, [subscribe])

  const updateDanmaku = useCallback(
    async (episodeId: number, danmaku: DanmakuCache) => {
      await set(0, danmaku, true)
      await getAllDanmaku()
    },
    [set, getAllDanmaku]
  )

  const deleteDanmaku = useCallback(
    async (episodeId: number) => {
      await remove(episodeId)
      await getAllDanmaku()
    },
    [remove, getAllDanmaku]
  )

  return {
    allDanmaku,
    updateDanmaku,
    deleteDanmaku,
    selectDanmaku,
    reload: getAllDanmaku,
    ...state,
  }
}
