import { AnimeSelectorPopup } from './fab/Popup'
import { useDanmakuManager } from './hooks/useDanmakuManager'
import { useIconManager } from './hooks/useIconManager'
import { useMediaObserver } from './hooks/useMediaObserver'
import { Toast } from './Toast'

import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'

export const Content = () => {
  const config = useMatchMountConfig(window.location.href)

  useIconManager()
  useDanmakuManager()
  useMediaObserver()

  if (!config) return null

  return (
    <>
      <Toast />
      <AnimeSelectorPopup />
    </>
  )
}
