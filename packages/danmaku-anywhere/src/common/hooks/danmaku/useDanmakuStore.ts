import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { DanmakuCache } from '@/common/hooks/danmaku/useDanmakuDb'
import {
  useExtStorage,
  useSubscribeExtStorage,
} from '@/common/hooks/useExtStorage'

export type DanmakuStore = Record<string | number, DanmakuCache>
const DANMAKU_KEY = 'danmaku'
// for read-only use cases, reduces number of renders
export const useReadonlyDanmakuStore = () => {
  const { getSnapshot, subscribe } = useSubscribeExtStorage<DanmakuStore>(
    DANMAKU_KEY,
    {
      storageType: 'local',
    }
  )

  const danmaku = useSyncExternalStore(subscribe, getSnapshot)

  const danmakuArray = useMemo(
    () => (danmaku ? Object.values(danmaku) : []),
    [danmaku]
  )

  return { danmaku, danmakuArray }
}

export const useDanmakuStore = (episodeId?: number) => {
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

  const selectDanmaku = (episodeId: number) => {
    return allDanmaku?.[episodeId] as DanmakuCache | undefined
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
    selectDanmaku,
    isLoading,
  }
}
