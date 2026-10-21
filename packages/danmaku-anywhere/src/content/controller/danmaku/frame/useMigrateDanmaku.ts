import { useEffect } from 'react'
import { Logger } from '@/common/Logger'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useStore } from '@/content/controller/store/store'

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
    if (!episodes) {
      return
    }
    mount(episodes).catch((error: unknown) => {
      Logger.debug('Failed to move danmaku to the active frame', error)
    })
  }, [activeFrameId, mountedFrameId])
}
