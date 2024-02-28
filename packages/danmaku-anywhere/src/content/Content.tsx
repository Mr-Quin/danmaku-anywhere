import { Suspense } from 'react'

import { DanmakuManagerComponent } from './danmakuManager/DanmakuManagertComponent'
import { PopupButton } from './fab/PopupButton'
import { IconManagerComponent } from './iconManager/IconManagerComponent'
import { MediaObserverComponent } from './mediaObserver/MediaObserverComponent'
import { Toast } from './Toast'

import type { MountConfig } from '@/common/constants/mountConfig'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'
import { useExtensionOptions } from '@/common/hooks/useExtensionOptions'

interface RenderWithConfigProps {
  children: (config: MountConfig) => JSX.Element
}

const RenderWithConfig = ({ children }: RenderWithConfigProps) => {
  const config = useMatchMountConfig(window.location.href)

  if (!config) return null

  return children(config)
}

export const Content = () => {
  const { data: options } = useExtensionOptions()

  if (!options.enabled) return null

  return (
    <RenderWithConfig>
      {(config) => {
        return (
          <>
            <IconManagerComponent config={config} />
            <MediaObserverComponent config={config} />
            <Suspense fallback={null}>
              <DanmakuManagerComponent config={config} />
            </Suspense>
            <PopupButton />
            <Toast />
          </>
        )
      }}
    </RenderWithConfig>
  )
}
