import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useStore } from '../../store/store'
import type { MediaObserver } from '../integration/MediaObserver'
import { observersMap } from '../integration/observers'

import { useToast } from '@/common/components/Toast/toastStore'
import { IntegrationType } from '@/common/danmaku/enums'
import { Logger } from '@/common/Logger'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'

export const useMatchObserver = () => {
  const { t } = useTranslation()
  const config = useActiveConfig()

  const toast = useToast.use.toast()

  const [observer, setObserver] = useState<MediaObserver>()

  const toggleManualMode = useStore((state) => state.toggleManualMode)
  const setIntegration = useStore((state) => state.setIntegration)

  useEffect(() => {
    // when config changes, try to find a matching observer
    const Observer = observersMap[config.integration]

    if (!Observer) {
      // no matching observer found, fallback to manual mode
      toggleManualMode(true)
      setIntegration(IntegrationType.None)
      return
    }

    toggleManualMode(false)
    setIntegration(config.integration)
    toast.info(t('integration.alert.usingIntegration', { name: config.name }))
    Logger.debug(`Using integration: ${config.integration}`)

    const obs = new Observer()

    setObserver(obs)
  }, [config])

  return observer
}
