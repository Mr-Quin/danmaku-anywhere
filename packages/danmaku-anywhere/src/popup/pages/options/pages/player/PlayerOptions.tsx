import { useTranslation } from 'react-i18next'

import { getSettingsByCategory } from '@/common/options/extensionOptions/settingConfigs'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { DeclarativeToggleSetting } from '@/popup/pages/options/components/DeclarativeToggleSetting'

export const PlayerOptions = () => {
  const { t } = useTranslation()
  const playerSettings = getSettingsByCategory('player')

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.player')} />
      {playerSettings.map((config) => (
        <DeclarativeToggleSetting key={config.id} config={config} />
      ))}
    </OptionsPageLayout>
  )
}
