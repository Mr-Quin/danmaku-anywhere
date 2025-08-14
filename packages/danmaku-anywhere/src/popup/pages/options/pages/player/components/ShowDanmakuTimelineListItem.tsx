import { useTranslation } from 'react-i18next'

import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ToggleListItemButton } from '@/popup/pages/options/components/ToggleListItemButton'

export const ShowDanmakuTimelineListItem = () => {
  const { t } = useTranslation()
  const { data, partialUpdate, isLoading } = useExtensionOptions()

  const handleToggle = async (checked: boolean) => {
    await partialUpdate({
      playerOptions: {
        ...data.playerOptions,
        showDanmakuTimeline: checked,
      },
    })
  }

  return (
    <ToggleListItemButton
      enabled={data.playerOptions.showDanmakuTimeline}
      onToggle={handleToggle}
      itemText={t('optionsPage.player.showDanmakuTimeline')}
      isLoading={isLoading}
    />
  )
}
