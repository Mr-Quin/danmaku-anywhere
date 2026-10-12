import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import {
  findSourceName,
  isUnreachableError,
} from '@/content/controller/danmaku/integration/sourceError'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'

interface SourceErrorInput {
  error: unknown
  // Shown when the source was reached but the request still failed.
  fallbackMessage: string
  providerConfigId?: string
}

export function useDescribeSourceError() {
  const { t } = useTranslation()
  const { open } = usePopup()
  const { configs } = useProviderConfig()

  return useEventCallback(
    ({ error, fallbackMessage, providerConfigId }: SourceErrorInput) => {
      const searchAction = {
        actionFn: () => open({ tab: PopupTab.Search }),
        actionLabel: t('integration.alert.openSearch', 'Open search page'),
      }

      if (!isUnreachableError(error)) {
        return { message: fallbackMessage, ...searchAction }
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
