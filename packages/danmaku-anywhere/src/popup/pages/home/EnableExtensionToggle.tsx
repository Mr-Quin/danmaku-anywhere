import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { StyledEnableSwitch } from '@/common/components/StyledEnableSwitch'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { tabQueryKeys } from '@/common/queries/queryKeys'

export const EnableExtensionToggle = () => {
  const { t } = useTranslation()
  const { partialUpdate, data: options } = useExtensionOptions()

  const queryClient = useQueryClient()

  const updateEnabled = async (enabled: boolean) => {
    await partialUpdate({ enabled })
    if (!enabled) {
      queryClient.setQueryData(tabQueryKeys.isConnected(), false)
    }
  }

  return (
    <StyledEnableSwitch
      checked={options.enabled}
      onChange={(e) => updateEnabled(e.target.checked)}
      size="small"
      slotProps={{ input: { 'aria-label': t('common.enable', 'Enable') } }}
    />
  )
}
