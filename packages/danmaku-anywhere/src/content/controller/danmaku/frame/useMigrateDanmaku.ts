import { useEffect } from 'react'
import { Logger } from '@/common/Logger'
import { sendUnmount } from '@/content/controller/common/danmakuCommands'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useStore } from '@/content/controller/store/store'

/**
 * Keeps the danmaku in the active frame: when the frame recorded as showing
 * them is not the active one, whether because the active frame changed or a
 * mount replied after it did, they move to the active frame.
 */
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
