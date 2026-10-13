import { useEffect, useRef } from 'react'
import { Logger } from '@/common/Logger'
import { sendUnmount } from '@/content/controller/common/danmakuCommands'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useStore } from '@/content/controller/store/store'

/**
 * When the active frame changes, moves the danmaku the previous frame showed
 * to the new one.
 */
export const useMigrateDanmaku = () => {
  const { activeFrame } = useStore.use.frame()

  const prevActiveFrameId = useRef<number>(activeFrame?.frameId)

  const { mount } = useLoadDanmaku()

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

    const { danmaku, frame } = useStore.getState()
    if (frame.allFrames.get(previous)?.mounted) {
      sendUnmount(previous).catch((error: unknown) => {
        Logger.debug('Failed to unmount danmaku from the previous frame', error)
      })
    }
    if (danmaku.mountedFrameId !== previous) {
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
