import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { integrationData } from '@/common/options/mountConfig/integrationData'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useStore } from '@/content/controller/store/store'

export const useSyncIntegrationManualMode = () => {
  const { t } = useTranslation()

  const { toast } = useToast()

  const activeConfig = useActiveConfig()

  const { toggleManualMode, isManual } = useStore.use.danmaku()

  useEffect(() => {
    if (activeConfig.mode !== 'manual') {
      toggleManualMode(false)
      toast.info(
        t('integration.alert.usingMode', 'Using Mode: {{mode}}', {
          mode: integrationData[activeConfig.mode].label(),
        })
      )
    } else {
      toggleManualMode(true)
    }
    Logger.debug(`Using mode: ${activeConfig.mode}`)
  }, [activeConfig])

  return isManual
}
