import { useEffect, useRef } from 'react'
import { Logger } from '@/common/Logger'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useStore } from '@/content/controller/store/store'

/**
 * When the active frame changes, moves the danmaku the previous frame showed
 * to the new one. Automatic matching still in flight will mount for the new
 * frame itself, so nothing is moved then.
 */
export const useMigrateDanmaku = () => {
  const { activeFrame } = useStore.use.frame()

  const prevActiveFrameId = useRef<number>(activeFrame?.frameId)

  const { mount } = useLoadDanmaku()
  const unmountDanmaku = useUnmountDanmaku({ silent: true })

  useEffect(() => {
    if (!activeFrame) {
      prevActiveFrameId.current = undefined
      return
    }
    const previous = prevActiveFrameId.current
    if (activeFrame.frameId === previous) {
      return
    }
    prevActiveFrameId.current = activeFrame.frameId
    if (previous === undefined) {
      return
    }

    const { danmaku, frame, integration } = useStore.getState()
    if (frame.allFrames.get(previous)?.mounted) {
      unmountDanmaku.mutate(previous)
    }
    if (integration.runInFlight || danmaku.mountedFrameId !== previous) {
      return
    }
    const { episodes } = danmaku
    if (!episodes || episodes.length === 0) {
      return
    }
    mount(episodes).catch((error: unknown) => {
      Logger.debug('Failed to move danmaku to the new frame', error)
    })
  }, [activeFrame])
}
