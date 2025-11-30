import { useTranslation } from 'react-i18next'

import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ToggleListItemButton } from '@/popup/pages/options/components/ToggleListItemButton'

export const SimplifiedSearchListItem = () => {
  const { t } = useTranslation()
  const { data, partialUpdate, isLoading } = useExtensionOptions()

  const handleToggle = async () => {
    await partialUpdate({ searchUsingSimplified: !data.searchUsingSimplified })
  }

  return (
    <ToggleListItemButton
      enabled={data.searchUsingSimplified}
      onToggle={handleToggle}
      itemText={t(
        'optionsPage.searchUsingSimplified',
        'Search using simplified Chinese'
      )}
      isLoading={isLoading}
    />
  )
}
