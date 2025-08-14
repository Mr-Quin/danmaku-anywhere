import { useTranslation } from 'react-i18next'

import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ToggleListItemButton } from '@/popup/pages/options/components/ToggleListItemButton'

export const ShowSkipButtonListItem = () => {
  const { t } = useTranslation()
  const { data, partialUpdate, isLoading } = useExtensionOptions()

  const handleToggle = async (checked: boolean) => {
    await partialUpdate({
      playerOptions: {
        ...data.playerOptions,
        showSkipButton: checked,
      },
    })
  }

  return (
    <ToggleListItemButton
      enabled={data.playerOptions.showSkipButton}
      onToggle={handleToggle}
      itemText={t('optionsPage.player.showSkipButton')}
      isLoading={isLoading}
    />
  )
}
