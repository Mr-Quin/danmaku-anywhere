import { useDanmakuManager } from './hooks/useDanmakuManager'
import { useMediaObserver } from './hooks/useMediaObserver'
import { Toast } from './Toast'
import { useIconManager } from './hooks/useIconManager'
import { AnimeSelectorPopup } from './fab/Popup'
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
