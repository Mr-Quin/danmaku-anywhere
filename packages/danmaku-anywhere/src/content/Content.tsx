import { Suspense } from 'react'

import { DanmakuContainer } from './danmaku/DanmakuContainer'
import { PopupButton } from './fab/PopupButton'
import { IconManagerComponent } from './iconManager/IconManagerComponent'
import { Toast } from './Toast'

import type { MountConfig } from '@/common/constants/mountConfig'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'
import { useExtensionOptions } from '@/common/hooks/useExtensionOptions'

interface RenderWithConfigProps {
  children: (config: MountConfig) => JSX.Element
}

const RenderWithConfig = ({ children }: RenderWithConfigProps) => {
  const config = useMatchMountConfig(window.location.href)

  // the script should not be loaded at all if the config is not enabled
  // this check is likely only necessary for when the user manually disables the config
  if (!config || !config.enabled) return null

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
            <Suspense fallback={null}>
              <DanmakuContainer config={config} />
            </Suspense>
            <PopupButton />
            <Toast />
          </>
        )
      }}
    </RenderWithConfig>
  )
}
