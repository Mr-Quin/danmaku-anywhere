import type { ExtensionOptions } from './schema'
import {
  getSettingById,
  settingConfigs,
  type SettingConfig,
  type ToggleSettingConfig,
} from './settingConfigs'

/**
 * Execute a setting command by its ID
 * Returns true if the command was executed successfully, false otherwise
 */
export const executeSettingCommand = async (
  commandId: string,
  options: ExtensionOptions,
  updateFn: (update: Partial<ExtensionOptions>) => Promise<void>
): Promise<boolean> => {
  const config = getSettingById(commandId)

  if (!config) {
    return false
  }

  if (config.type === 'toggle') {
    const toggleConfig = config as ToggleSettingConfig
    const currentValue = toggleConfig.getValue(options)
    const newValue = !currentValue
    const update = toggleConfig.createUpdate(options, newValue)
    await updateFn(update)
    return true
  }

  return false
}

/**
 * Get all available command IDs
 */
export const getAllCommandIds = (): string[] => {
  return settingConfigs.map((config) => config.id)
}

/**
 * Get command metadata for display in command palette
 */
export const getCommandMetadata = (commandId: string): {
  id: string
  label: string
  category: string
} | null => {
  const config = getSettingById(commandId)

  if (!config) {
    return null
  }

  // For now, we'll need to handle translation in the UI layer
  // This is just the structure
  return {
    id: config.id,
    label: config.labelKey || config.label || '',
    category: config.category,
  }
}
