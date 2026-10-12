import { Suspense } from 'react'

import { GlobalDialog } from '@/common/components/Dialog/GlobalDialog'
import { Toast } from '@/common/components/Toast/Toast'
import { DanmakuHotkeys } from '@/content/controller/common/components/DanmakuHotkeys'
import { SwitchLanguage } from '@/content/controller/common/components/SwitchLanguage'
import { ControllerRpcServer } from '@/content/controller/controllerRpc/ControllerRpcServer'
import { FrameManager } from '@/content/controller/danmaku/frame/FrameManager'
import { RegisterIntegration } from '@/content/controller/danmaku/integration/RegisterIntegration'
import { IconManagerComponent } from '@/content/controller/iconManager/IconManagerComponent'
import { usePopup } from '@/content/controller/store/popupStore'
import { PopupUi } from '@/content/controller/ui/PopupUi'
import { HIGHLIGHTER_PORTAL_ID } from './common/constants/rootId'

export const Content = () => {
  const setHighlighterPortal = usePopup.use.setHighlighterPortal()

  return (
    <>
      <Suspense fallback={null}>
        <IconManagerComponent />
        <RegisterIntegration />
        <FrameManager />
        <DanmakuHotkeys />
      </Suspense>
      <ControllerRpcServer />
      <Suspense fallback={null}>
        <PopupUi />
      </Suspense>
      <Toast
        stackable
        disableCloseOnClickAway
        snackbarProps={{
          anchorOrigin: { vertical: 'top', horizontal: 'center' },
        }}
      />
      <GlobalDialog />
      <SwitchLanguage />
      <div
        id={HIGHLIGHTER_PORTAL_ID}
        ref={setHighlighterPortal}
        style={{ zIndex: 1403, position: 'absolute' }}
      />
    </>
  )
}
