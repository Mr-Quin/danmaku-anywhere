import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { isConfigIncomplete } from '@/common/options/mountConfig/isPermissive'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'

export const useWarnIncompleteConfig = () => {
  const { t } = useTranslation()

  const { toast } = useToast()

  const activeConfig = useActiveConfig()

  const isIncomplete = useMemo(
    () => isConfigIncomplete(activeConfig),
    [activeConfig]
  )

  useEffect(() => {
    if (isIncomplete) {
      toast.warn(
        t(
          'integration.alert.noIntegration',
          'Integration policy not configured'
        )
      )
    }
  }, [isIncomplete])

  return isIncomplete
}
