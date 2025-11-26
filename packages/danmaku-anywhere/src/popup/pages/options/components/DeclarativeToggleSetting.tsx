import { useTranslation } from 'react-i18next'

import type { ToggleSettingConfig } from '@/common/options/extensionOptions/settingConfigs'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ToggleListItemButton } from './ToggleListItemButton'

interface DeclarativeToggleSettingProps {
  config: ToggleSettingConfig
}

/**
 * Generic component for rendering a toggle setting based on declarative config
 */
export const DeclarativeToggleSetting = ({ config }: DeclarativeToggleSettingProps) => {
  const { t } = useTranslation()
  const { data, partialUpdate, isLoading } = useExtensionOptions()

  const currentValue = config.getValue(data)

  const handleToggle = async (checked: boolean) => {
    const update = config.createUpdate(data, checked)
    await partialUpdate(update)
  }

  // Support both translation keys and hardcoded labels
  const label = config.labelKey ? t(config.labelKey) : config.label ?? ''

  return (
    <ToggleListItemButton
      enabled={currentValue}
      onToggle={handleToggle}
      itemText={label}
      isLoading={isLoading}
    />
  )
}
