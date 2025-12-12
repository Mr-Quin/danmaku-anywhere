import type { ToggleSettingConfig } from '@/common/settings/settingConfigs'
import { ToggleListItemButton } from './ToggleListItemButton'

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
  const currentValue = config.getValue(state)

  const handleToggle = async (checked: boolean) => {
    const update = config.createUpdate(state, checked)
    await onUpdate(update)
  }

  return (
    <ToggleListItemButton
      enabled={currentValue}
      onToggle={handleToggle}
      itemText={config.label()}
      isLoading={isLoading}
    />
  )
}
