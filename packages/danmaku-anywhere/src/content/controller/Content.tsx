import { Suspense } from 'react'

import { Toast } from '@/common/components/Toast/Toast'
import { SwitchLanguage } from '@/content/controller/common/components/SwitchLanguage'
import { ControllerRpcServer } from '@/content/controller/controllerRpc/ControllerRpcServer'
import { FrameManager } from '@/content/controller/danmaku/frame/FrameManager'
import { RegisterIntegration } from '@/content/controller/danmaku/integration/RegisterIntegration'
import { IconManagerComponent } from '@/content/controller/iconManager/IconManagerComponent'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { PopupUi } from '@/content/controller/ui/PopupUi'

export const Content = () => {
  const isVisible = useStore((state) => state.danmaku.isVisible)
  const setHighlighterPortal = usePopup.use.setHighlighterPortal()

  return (
    <>
      <Suspense fallback={null}>
        <IconManagerComponent />
        {isVisible && <RegisterIntegration />}
        <FrameManager />
      </Suspense>
      <ControllerRpcServer />
      <PopupUi />
      <Toast stackable disableCloseOnClickAway />
      <SwitchLanguage />
      <div
        id="danmaku-anywhere-highlighter-portal"
        ref={(element) => {
          if (element) {
            setHighlighterPortal(element)
          }
        }}
      />
    </>
  )
}
