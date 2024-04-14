import { Suspense } from 'react'

import { DanmakuContainer } from './danmaku/container/DanmakuContainer'
import { DanmakuManager } from './danmaku/danmakuManager/DanmakuManager'
import { MediaObserver } from './danmaku/mediaObserver/MediaObserver'
import { IconManagerComponent } from './iconManager/IconManagerComponent'
import { useStore } from './store/store'
import { TabRpcServer } from './tabRpc/TabRpc'

import { Toast } from '@/common/components/toast/Toast'
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
              <MediaObserver />
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
