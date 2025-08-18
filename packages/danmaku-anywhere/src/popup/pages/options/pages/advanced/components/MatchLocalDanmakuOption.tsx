import { useTranslation } from 'react-i18next'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ToggleListItemButton } from '@/popup/pages/options/components/ToggleListItemButton'

export const MatchLocalDanmakuOption = () => {
  const { t } = useTranslation()

  const { data, partialUpdate, isLoading } = useExtensionOptions()

  const handleToggle = async () => {
    await partialUpdate({ matchLocalDanmaku: !data.matchLocalDanmaku })
  }

  return (
    <ToggleListItemButton
      enabled={data.matchLocalDanmaku}
      onToggle={handleToggle}
      itemText={t('optionsPage.matchLocalDanmaku')}
      isLoading={isLoading}
    />
  )
}
