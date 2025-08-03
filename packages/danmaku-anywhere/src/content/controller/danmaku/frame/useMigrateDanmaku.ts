import type { GenericEpisode } from '@danmaku-anywhere/danmaku-converter'
import { useEffect, useRef } from 'react'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useStore } from '@/content/controller/store/store'

export const useMigrateDanmaku = () => {
  const { allFrames, activeFrame } = useStore.use.frame()
  const { episodes } = useStore.use.danmaku()

  const prevActiveFrameId = useRef<number>(activeFrame?.frameId)

  const { mountDanmaku } = useLoadDanmaku()
  const unmountDanmaku = useUnmountDanmaku()

  useEffect(() => {
    if (!activeFrame) {
      prevActiveFrameId.current = undefined
      return
    }

    if (activeFrame.frameId === prevActiveFrameId.current) return

    /**
     * If the active frame changes, "migrate" danmaku to the new frame if there are comments
     *
     * If the previous active frame is mounted, unmount the danmaku,
     * then mount it to the new active frame
     */
    if (
      prevActiveFrameId.current &&
      allFrames.get(prevActiveFrameId.current)?.mounted
    ) {
      unmountDanmaku.mutate(prevActiveFrameId.current)
    }

    if (episodes && episodes.length > 0) {
      if ('comments' in episodes[0]) {
        void mountDanmaku(episodes as GenericEpisode[])
      }
    }

    prevActiveFrameId.current = activeFrame.frameId
  }, [activeFrame])
}
