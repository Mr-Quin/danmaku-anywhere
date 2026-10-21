import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { findSourceName } from '@/common/options/providerConfig/utils'
import { describeSourceError } from '@/common/providers/describeSourceError'
import { isUnreachableError } from '@/common/providers/SourceError'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'

interface SourceErrorInput {
  error: unknown
  describeFailure: (reason: string) => string
  providerConfigId?: string
}

export function useDescribeSourceError() {
  const { t } = useTranslation()
  const { open } = usePopup()
  const { configs } = useProviderConfig()

  return useEventCallback(
    ({ error, describeFailure, providerConfigId }: SourceErrorInput) => {
      const searchAction = {
        actionFn: () => open({ tab: PopupTab.Search }),
        actionLabel: t('integration.alert.openSearch', 'Open search page'),
      }

      if (!isUnreachableError(error)) {
        return {
          message: describeFailure(describeSourceError(error)),
          ...searchAction,
        }
      }

      const source = findSourceName(configs, providerConfigId)
      if (source === undefined) {
        return {
          message: t(
            'integration.alert.sourceUnreachableUnnamed',
            "Couldn't reach the danmaku source"
          ),
          ...searchAction,
        }
      }
      return {
        message: t(
          'integration.alert.sourceUnreachable',
          "Couldn't reach {{source}}",
          { source }
        ),
        ...searchAction,
      }
    }
  )
}
