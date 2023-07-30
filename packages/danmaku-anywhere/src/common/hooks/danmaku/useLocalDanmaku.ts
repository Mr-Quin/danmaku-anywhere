import {
  DanDanComment,
  DanDanCommentAPIParams,
} from '@danmaku-anywhere/danmaku-engine'
import { useEffect, useMemo, useState } from 'react'
import useExtStorage from '@/common/hooks/useExtStorage'

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
  schemaVersion: number
}

export type DanmakuStore = Record<string, DanmakuCache>

const DANMAKU_KEY = 'danmaku'
export const useLocalDanmaku = (episodeId?: number) => {
  const {
    data: allDanmaku,
    isInit,
    isLoading,
    setData: setAllDanmaku,
  } = useExtStorage<DanmakuStore>(DANMAKU_KEY, {
    storageType: 'local',
    sync: false,
  })

  const allDanmakuArray = useMemo(
    () => (allDanmaku ? Object.values(allDanmaku) : []),
    [allDanmaku]
  )

  const [selectedDanmaku, setSelectedDanmaku] = useState<DanmakuCache | null>(
    null
  )

  const updateDanmaku = async (episodeId: number, danmaku: DanmakuCache) => {
    const newDanmaku = { ...allDanmaku, [episodeId]: danmaku }
    await setAllDanmaku(newDanmaku)
  }

  const deleteDanmaku = async (episodeId: number) => {
    const newDanmaku = { ...allDanmaku }
    delete newDanmaku[episodeId]
    await setAllDanmaku(newDanmaku)
  }

  // initialize allDanmaku to empty object if it's not initialized
  useEffect(() => {
    if (
      !isInit &&
      !isLoading &&
      (allDanmaku === undefined || allDanmaku === null)
    ) {
      setAllDanmaku({})
    }
  }, [isInit, isLoading, allDanmaku, setAllDanmaku])

  useEffect(() => {
    if (isLoading || !allDanmaku) return
    setSelectedDanmaku(episodeId ? allDanmaku[episodeId] ?? null : null)
  }, [episodeId, allDanmaku, isLoading])

  return {
    danmaku: selectedDanmaku,
    allDanmaku,
    allDanmakuArray,
    updateDanmaku,
    deleteDanmaku,
    isLoading,
  }
}
