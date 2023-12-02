import { useDanmakuManager } from './hooks/useDanmakuManager'
import { useMediaObserver } from './hooks/useMediaObserver'
import { Toast } from './Toast'
import { useIconManager } from './hooks/useIconManager'
import { AnimeSelectorPopup } from './AnimeSelector'

export const Content = () => {
  useIconManager()
  useDanmakuManager()
  useMediaObserver()

  return (
    <>
      <Toast />
      <AnimeSelectorPopup />
    </>
  )
}
