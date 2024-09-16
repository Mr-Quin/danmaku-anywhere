import { Suspense } from 'react'

import { DanmakuContainer } from './danmaku/container/DanmakuContainer'
import { DanmakuManager } from './danmaku/danmakuManager/DanmakuManager'
import { RegisterIntegration } from './danmaku/integration/RegisterIntegration'
import { IconManagerComponent } from './iconManager/IconManagerComponent'
import { useStore } from './store/store'
import { TabRpcServer } from './tabRpc/TabRpc'

import { Toast } from '@/common/components/Toast/Toast'
import { AutomaticMode } from '@/content/common/components/AutomaticMode'
import { PopupUi } from '@/content/floatingUi/PopupUi'

export const Content = () => {
  const enabled = useStore((state) => state.enabled)

  return (
    <>
      <Suspense fallback={null}>
        <IconManagerComponent />
        {enabled && (
          <>
            <DanmakuContainer />
            <DanmakuManager />
            <AutomaticMode>
              <RegisterIntegration />
            </AutomaticMode>
          </>
        )}
      </Suspense>
      <TabRpcServer />
      <PopupUi />
      <Toast />
    </>
  )
}
