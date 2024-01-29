import { DanmakuManagerWrapper } from './danmakuManager/DanmakuManagerWrapper'
import { PopupButton } from './fab/PopupButton'
import { useIconManager } from './hooks/useIconManager'
import { useMediaObserver } from './hooks/useMediaObserver'
import { Toast } from './Toast'

import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'
import { useExtensionOptions } from '@/common/hooks/useExtensionOptions'

export const Content = () => {
  const config = useMatchMountConfig(window.location.href)
  const observer = useMediaObserver()

  useIconManager()

  const { data: options, isLoading } = useExtensionOptions()

  if (isLoading || options?.enabled === false) return null

  return (
    <>
      <Toast />
      {observer && <PopupButton />}
      {config && <DanmakuManagerWrapper />}
    </>
  )
}
