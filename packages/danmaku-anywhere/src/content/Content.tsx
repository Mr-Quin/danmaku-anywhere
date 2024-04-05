import { Suspense } from 'react'

import { AutomaticDanmaku } from './danmaku/AutomaticMode'
import { DanmakuContainer } from './danmaku/DanmakuContainer'
import { PopupButton } from './fab/PopupButton'
import { IconManagerComponent } from './iconManager/IconManagerComponent'
import { TabRpcServer } from './tabRpc/TabRpc'
import { Toast } from './Toast'

export const Content = () => {
  return (
    <>
      <IconManagerComponent />
      <Suspense fallback={null}>
        <DanmakuContainer />
      </Suspense>
      <AutomaticDanmaku />
      <TabRpcServer />
      <PopupButton />
      <Toast />
    </>
  )
}
