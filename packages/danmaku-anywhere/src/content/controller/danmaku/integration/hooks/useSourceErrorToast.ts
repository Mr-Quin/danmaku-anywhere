import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import {
  findSourceName,
  isUnreachableError,
} from '@/content/controller/danmaku/integration/sourceError'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'

interface SourceErrorToastInput {
  error: unknown
  // Shown when the source was reached but the request still failed.
  fallbackMessage: string
  providerConfigId?: string
}

export function useSourceErrorToast() {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { open } = usePopup()
  const { configs } = useProviderConfig()

  return useEventCallback(
    ({ error, fallbackMessage, providerConfigId }: SourceErrorToastInput) => {
      const searchAction = {
        actionFn: () => open({ tab: PopupTab.Search }),
        actionLabel: t('integration.alert.openSearch', 'Open search page'),
      }

      if (!isUnreachableError(error)) {
        toast.error(fallbackMessage, searchAction)
        return
      }

      const source = findSourceName(configs, providerConfigId)
      const message =
        source === undefined
          ? t(
              'integration.alert.sourceUnreachableUnnamed',
              "Couldn't reach the danmaku source"
            )
          : t(
              'integration.alert.sourceUnreachable',
              "Couldn't reach {{source}}",
              {
                source,
              }
            )
      toast.error(message, searchAction)
    }
  )
}
