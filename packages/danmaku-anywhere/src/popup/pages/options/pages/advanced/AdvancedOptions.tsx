import { useTranslation } from 'react-i18next'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import type { AdvancedGroup } from '@/common/settings/settingConfigs'
import { settingConfigs } from '@/common/settings/settingConfigs'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { DeclarativeButtonSetting } from '@/popup/pages/options/components/DeclarativeButtonSetting'
import { DeclarativeToggleSetting } from '@/popup/pages/options/components/DeclarativeToggleSetting'
import {
  SettingsGroup,
  SettingsGroupLabel,
} from '@/popup/pages/options/components/settings/SettingsGroup'

export const AdvancedOptions = () => {
  const { t } = useTranslation()
  const { data, partialUpdate, isLoading } = useExtensionOptions()

  const groupLabels: Record<AdvancedGroup, string> = {
    behavior: t('optionsPage.advanced.behavior', 'Behavior'),
    privacy: t('optionsPage.advanced.privacy', 'Privacy'),
    diagnostics: t('optionsPage.advanced.diagnostics', 'Diagnostics'),
  }
  const orderedGroups = Object.keys(groupLabels) as AdvancedGroup[]

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.advanced', 'Advanced')} />
      {orderedGroups.map((group) => {
        const configs = settingConfigs.advanced.filter(
          (config) => config.group === group
        )
        return (
          <div key={group}>
            <SettingsGroupLabel>{groupLabels[group]}</SettingsGroupLabel>
            <SettingsGroup sx={{ mb: 1.75 }}>
              {configs.map((config) => {
                if (config.type === 'button') {
                  return (
                    <DeclarativeButtonSetting
                      key={config.id}
                      config={config}
                      isLoading={isLoading}
                    />
                  )
                }
                return (
                  <DeclarativeToggleSetting
                    key={config.id}
                    config={config}
                    state={data}
                    onUpdate={partialUpdate}
                    isLoading={isLoading}
                  />
                )
              })}
            </SettingsGroup>
          </div>
        )
      })}
    </OptionsPageLayout>
  )
}
