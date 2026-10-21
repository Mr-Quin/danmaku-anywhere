import { useEffect } from 'react'
import { Logger } from '@/common/Logger'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useStore } from '@/content/controller/store/store'

export const useSyncIntegrationManualMode = () => {
  const activeConfig = useActiveConfig()

  const { toggleManualMode, isManual } = useStore.use.danmaku()

  useEffect(() => {
    if (activeConfig.mode !== 'manual') {
      toggleManualMode(false)
    } else {
      toggleManualMode(true)
    }
    Logger.debug(`Using mode: ${activeConfig.mode}`)
  }, [activeConfig])

  return isManual
}
