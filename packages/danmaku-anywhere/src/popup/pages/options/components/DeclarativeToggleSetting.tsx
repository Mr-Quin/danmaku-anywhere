import type { ToggleSettingConfig } from '@/common/settings/settingConfigs'
import { SettingsToggleRow } from './settings/SettingsGroup'

interface DeclarativeToggleSettingProps<S> {
  config: ToggleSettingConfig<S>
  state: S
  onUpdate: (update: Partial<S>) => Promise<void> | void
  isLoading?: boolean
}

export const DeclarativeToggleSetting = <S,>({
  config,
  state,
  onUpdate,
  isLoading,
}: DeclarativeToggleSettingProps<S>) => {
  const handleToggle = async (checked: boolean) => {
    await onUpdate(config.createUpdate(state, checked))
  }

  return (
    <SettingsToggleRow
      title={config.label()}
      subtitle={config.description?.()}
      checked={config.getValue(state)}
      onToggle={handleToggle}
      loading={isLoading}
    />
  )
}
