import { useTranslation } from 'react-i18next'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import type { AdvancedGroup } from '@/common/settings/settingConfigs'
import {
  settingConfigs,
  UPLOAD_DEBUG_DATA_BUTTON,
} from '@/common/settings/settingConfigs'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { DeclarativeButtonSetting } from '@/popup/pages/options/components/DeclarativeButtonSetting'
import { DeclarativeToggleSetting } from '@/popup/pages/options/components/DeclarativeToggleSetting'
import {
  SettingsGroup,
  SettingsGroupLabel,
} from '@/popup/pages/options/components/settings/SettingsGroup'

const GROUP_ORDER: AdvancedGroup[] = ['behavior', 'privacy', 'diagnostics']

export const AdvancedOptions = () => {
  const { t } = useTranslation()
  const { data, partialUpdate, isLoading } = useExtensionOptions()

  const groupLabels: Record<AdvancedGroup, string> = {
    behavior: t('optionsPage.advanced.behavior', 'Behavior'),
    privacy: t('optionsPage.advanced.privacy', 'Privacy'),
    diagnostics: t('optionsPage.advanced.diagnostics', 'Diagnostics'),
  }

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.advanced', 'Advanced')} />
      {GROUP_ORDER.map((group) => {
        const toggles = settingConfigs.advanced.filter(
          (config) => config.group === group
        )
        return (
          <div key={group}>
            <SettingsGroupLabel>{groupLabels[group]}</SettingsGroupLabel>
            <SettingsGroup sx={{ mb: 1.75 }}>
              {toggles.map((config) => (
                <DeclarativeToggleSetting
                  key={config.id}
                  config={config}
                  state={data}
                  onUpdate={partialUpdate}
                  isLoading={isLoading}
                />
              ))}
              {group === 'diagnostics' && (
                <DeclarativeButtonSetting
                  config={UPLOAD_DEBUG_DATA_BUTTON}
                  isLoading={isLoading}
                />
              )}
            </SettingsGroup>
          </div>
        )
      })}
    </OptionsPageLayout>
  )
}
