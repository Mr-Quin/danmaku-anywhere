import { useTranslation } from 'react-i18next'

import { getSettingsByCategory } from '@/common/options/extensionOptions/settingConfigs'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { DeclarativeToggleSetting } from '@/popup/pages/options/components/DeclarativeToggleSetting'

export const AdvancedOptions = () => {
  const { t } = useTranslation()
  const advancedSettings = getSettingsByCategory('advanced')

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.advanced')} />
      {advancedSettings.map((config) => (
        <DeclarativeToggleSetting key={config.id} config={config} />
      ))}
    </OptionsPageLayout>
  )
}
