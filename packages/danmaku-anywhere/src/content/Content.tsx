import { AnimeSelectorPopup } from './fab/Popup'
import { useDanmakuManager } from './hooks/useDanmakuManager'
import { useIconManager } from './hooks/useIconManager'
import { useMediaObserver } from './hooks/useMediaObserver'
import { useStore } from './store/store'
import { Toast } from './Toast'

import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'

export const Content = () => {
  const config = useMatchMountConfig(window.location.href)
  const observer = useStore((state) => state.activeObserver)

  useIconManager()
  useDanmakuManager()
  useMediaObserver()

  if (!config || !observer) return null

  return (
    <>
      <Toast />
      <AnimeSelectorPopup />
    </>
  )
}
