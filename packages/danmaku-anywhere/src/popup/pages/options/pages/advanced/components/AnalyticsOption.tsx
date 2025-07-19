import { useTranslation } from 'react-i18next'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ToggleListItemButton } from '@/popup/pages/options/components/ToggleListItemButton'

export const AnalyticsOption = () => {
  const { t } = useTranslation()
  const { data, partialUpdate, isLoading } = useExtensionOptions()

  const handleToggle = async () => {
    await partialUpdate({ enableAnalytics: !data.enableAnalytics })
  }

  return (
    <ToggleListItemButton
      enabled={data.enableAnalytics}
      onToggle={handleToggle}
      itemText={t('optionsPage.enableAnalytics')}
      isLoading={isLoading}
    />
  )
}
