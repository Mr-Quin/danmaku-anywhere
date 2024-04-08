import { Suspense } from 'react'

import { AutomaticMode } from './components/AutomaticMode'
import { DanmakuContainer } from './danmaku/container/DanmakuContainer'
import { DanmakuManager } from './danmaku/danmakuManager/DanmakuManager'
import { MediaObserver } from './danmaku/mediaObserver/MediaObserver'
import { PopupButton } from './fab/PopupButton'
import { IconManagerComponent } from './iconManager/IconManagerComponent'
import { TabRpcServer } from './tabRpc/TabRpc'

import { Toast } from '@/common/components/toast/Toast'

export const Content = () => {
  return (
    <>
      <Suspense fallback={null}>
        <IconManagerComponent />
        <DanmakuContainer />
        <DanmakuManager />
        <AutomaticMode>
          <MediaObserver />
        </AutomaticMode>
      </Suspense>
      <TabRpcServer />
      <PopupButton />
      <Toast />
    </>
  )
}
