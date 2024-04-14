import { useEffect, useState } from 'react'

import { useStore } from '../../store/store'
import type { MediaObserver } from '../integration/MediaObserver'
import { observersMap } from '../integration/observers'

import { useToast } from '@/common/components/toast/toastStore'
import { Logger } from '@/common/services/Logger'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'

export const useMatchObserver = () => {
  const config = useActiveConfig()

  const toast = useToast.use.toast()

  const [observer, setObserver] = useState<MediaObserver>()

  const toggleManualMode = useStore((state) => state.toggleManualMode)
  const setIntegration = useStore((state) => state.setIntegration)

  useEffect(() => {
    // when config changes, try to find a matching observer
    const Observer = observersMap[config.name]

    if (!Observer) {
      // no matching observer found, fallback to manual mode
      toggleManualMode(true)
      setIntegration(undefined)
      return
    }

    toggleManualMode(false)
    setIntegration(config.name)
    toast.info(`Using integration: ${config.name}`)
    Logger.debug(`Using integration: ${config.name}`)

    const obs = new Observer()

    setObserver(obs)
  }, [config])

  return observer
}
