import { useEffect } from 'react'

import { useStore } from '../../store/store'
import { observersMap } from '../integration/observers'

import { useToast } from '@/common/components/toast/toastStore'
import { Logger } from '@/common/services/Logger'
import { useActiveConfig } from '@/content/hooks/useActiveConfig'

export const useMatchObserver = () => {
  const config = useActiveConfig()

  const toast = useToast.use.toast()

  const setObserver = useStore((state) => state.setObserver)
  const unsetObserver = useStore((state) => state.unsetObserver)
  const toggleManualMode = useStore((state) => state.toggleManualMode)

  useEffect(() => {
    // when config changes, try to find a matching observer
    const Observer = observersMap[config.name]

    if (!Observer) {
      // no matching observer found, fallback to manual mode
      toggleManualMode(true)
      return
    }

    toggleManualMode(false)
    toast.info(`Using integration: ${config.name}`)
    Logger.debug(`Using integration: ${config.name}`)

    const obs = new Observer()

    setObserver(config.name, obs)

    return () => unsetObserver()
  }, [config])
}
