import { useEffect } from 'react'
import { Logger } from '@/common/Logger'
import { sendUnmount } from '@/content/controller/common/danmakuCommands'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useStore } from '@/content/controller/store/store'

// A mount that replies after the active frame changed also leaves the danmaku
// in a frame that is no longer active.
export const useMigrateDanmaku = () => {
  const activeFrameId = useStore((state) => state.frame.activeFrame?.frameId)
  const mountedFrameId = useStore((state) => state.danmaku.mountedFrameId)

  const { mount } = useLoadDanmaku()

  useEffect(() => {
    if (
      activeFrameId === undefined ||
      mountedFrameId === undefined ||
      mountedFrameId === activeFrameId
    ) {
      return
    }
    const { episodes } = useStore.getState().danmaku
    sendUnmount(mountedFrameId).catch((error: unknown) => {
      Logger.debug('Failed to unmount danmaku from the previous frame', error)
    })
    if (!episodes || episodes.length === 0) {
      return
    }
    mount(episodes).catch((error: unknown) => {
      Logger.debug('Failed to move danmaku to the active frame', error)
    })
  }, [activeFrameId, mountedFrameId])
}
