import { Suspense } from 'react'

import { Toast } from '@/common/components/Toast/Toast'
import { FrameManager } from '@/content/controller/danmaku/frame/FrameManager'
import { RegisterIntegration } from '@/content/controller/danmaku/integration/RegisterIntegration'
import { IconManagerComponent } from '@/content/controller/iconManager/IconManagerComponent'
import { useStore } from '@/content/controller/store/store'
import { TabRpcServer } from '@/content/controller/tabRpc/TabRpc'
import { PopupUi } from '@/content/controller/ui/PopupUi'

export const Content = () => {
  const enabled = useStore((state) => state.enabled)

  return (
    <>
      <Suspense fallback={null}>
        <IconManagerComponent />
        {enabled && (
          <>
            <RegisterIntegration />
          </>
        )}
        <FrameManager />
      </Suspense>
      <TabRpcServer />
      <PopupUi />
      <Toast />
    </>
  )
}