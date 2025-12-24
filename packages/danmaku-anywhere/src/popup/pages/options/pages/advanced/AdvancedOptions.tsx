import { useTranslation } from 'react-i18next'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import {
  EXPORT_DEBUG_DATA_BUTTON,
  settingConfigs,
} from '@/common/settings/settingConfigs'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { DeclarativeButtonSetting } from '@/popup/pages/options/components/DeclarativeButtonSetting'
import { DeclarativeToggleSetting } from '@/popup/pages/options/components/DeclarativeToggleSetting'

export const AdvancedOptions = () => {
  const { t } = useTranslation()
  const { data, partialUpdate, isLoading } = useExtensionOptions()

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.advanced', 'Advanced')} />
      {settingConfigs.advanced.map((config) => (
        <DeclarativeToggleSetting
          key={config.id}
          config={config}
          state={data}
          onUpdate={partialUpdate}
          isLoading={isLoading}
        />
      ))}
      <DeclarativeButtonSetting
        config={EXPORT_DEBUG_DATA_BUTTON}
        isLoading={isLoading}
      />
    </OptionsPageLayout>
  )
}
