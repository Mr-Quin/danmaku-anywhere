import type { ExtensionOptions } from './schema'

/**
 * Command ID for a setting - used for command palette, hotkeys, etc.
 */
export type SettingCommandId = string

/**
 * Category for organizing settings in the UI
 */
export type SettingCategory = 'advanced' | 'player' | 'general'

/**
 * Path to a setting value in ExtensionOptions
 * Supports nested paths like 'playerOptions.showSkipButton'
 */
export type SettingPath = keyof ExtensionOptions | `playerOptions.${keyof ExtensionOptions['playerOptions']}` | `retentionPolicy.${keyof ExtensionOptions['retentionPolicy']}`

/**
 * Get the value type for a setting path
 */
type GetSettingValueType<T extends SettingPath> = T extends keyof ExtensionOptions
  ? ExtensionOptions[T]
  : T extends `playerOptions.${infer K}`
    ? K extends keyof ExtensionOptions['playerOptions']
      ? ExtensionOptions['playerOptions'][K]
      : never
    : T extends `retentionPolicy.${infer K}`
      ? K extends keyof ExtensionOptions['retentionPolicy']
        ? ExtensionOptions['retentionPolicy'][K]
        : never
      : never

/**
 * Base setting configuration with label (either translation key or hardcoded)
 */
export type BaseSettingConfig<T extends SettingPath = SettingPath> = {
  /**
   * Unique command ID for this setting
   * Used for command palette, hotkeys, etc.
   */
  id: SettingCommandId

  /**
   * Category for organizing settings
   */
  category: SettingCategory

  /**
   * Path to the setting value in ExtensionOptions
   */
  path: T

  /**
   * Optional description/help text translation key
   */
  descriptionKey?: string

  /**
   * Whether this setting should be shown in the UI
   * Can be a function that checks current options state
   */
  visible?: boolean | ((options: ExtensionOptions) => boolean)
} & (
  | {
      /**
       * Translation key for the setting label
       */
      labelKey: string
      label?: never
    }
  | {
      /**
       * Hardcoded label for the setting
       */
      label: string
      labelKey?: never
    }
)

/**
 * Toggle setting configuration (boolean settings)
 */
export interface ToggleSettingConfig<T extends SettingPath = SettingPath> extends BaseSettingConfig<T> {
  type: 'toggle'
  /**
   * Get the current value from options
   */
  getValue: (options: ExtensionOptions) => boolean
  /**
   * Create the update payload for this setting
   */
  createUpdate: (options: ExtensionOptions, newValue: boolean) => Partial<ExtensionOptions>
}

/**
 * Union type for all setting configs
 */
export type SettingConfig = ToggleSettingConfig

/**
 * Registry of all setting configurations
 */
export const settingConfigs: SettingConfig[] = [
  // Advanced settings
  {
    id: 'toggle.analytics',
    labelKey: 'optionsPage.enableAnalytics',
    category: 'advanced',
    path: 'enableAnalytics',
    type: 'toggle',
    getValue: (options) => options.enableAnalytics,
    createUpdate: (_, newValue) => ({ enableAnalytics: newValue }),
  },
  {
    id: 'toggle.debug',
    label: 'Debug',
    category: 'advanced',
    path: 'debug',
    type: 'toggle',
    getValue: (options) => options.debug,
    createUpdate: (_, newValue) => ({ debug: newValue }),
  },
  {
    id: 'toggle.matchLocalDanmaku',
    labelKey: 'optionsPage.matchLocalDanmaku',
    category: 'advanced',
    path: 'matchLocalDanmaku',
    type: 'toggle',
    getValue: (options) => options.matchLocalDanmaku,
    createUpdate: (_, newValue) => ({ matchLocalDanmaku: newValue }),
  },
  {
    id: 'toggle.searchUsingSimplified',
    labelKey: 'optionsPage.searchUsingSimplified',
    category: 'advanced',
    path: 'searchUsingSimplified',
    type: 'toggle',
    getValue: (options) => options.searchUsingSimplified,
    createUpdate: (_, newValue) => ({ searchUsingSimplified: newValue }),
  },
  // Player settings
  {
    id: 'toggle.player.showSkipButton',
    labelKey: 'optionsPage.player.showSkipButton',
    category: 'player',
    path: 'playerOptions.showSkipButton',
    type: 'toggle',
    getValue: (options) => options.playerOptions.showSkipButton,
    createUpdate: (options, newValue) => ({
      playerOptions: {
        ...options.playerOptions,
        showSkipButton: newValue,
      },
    }),
  },
  {
    id: 'toggle.player.showDanmakuTimeline',
    labelKey: 'optionsPage.player.showDanmakuTimeline',
    category: 'player',
    path: 'playerOptions.showDanmakuTimeline',
    type: 'toggle',
    getValue: (options) => options.playerOptions.showDanmakuTimeline,
    createUpdate: (options, newValue) => ({
      playerOptions: {
        ...options.playerOptions,
        showDanmakuTimeline: newValue,
      },
    }),
  },
] as const

/**
 * Get all settings for a specific category
 */
export const getSettingsByCategory = (category: SettingCategory): SettingConfig[] => {
  return settingConfigs.filter((config) => config.category === category)
}

/**
 * Get a setting config by its command ID
 */
export const getSettingById = (id: SettingCommandId): SettingConfig | undefined => {
  return settingConfigs.find((config) => config.id === id)
}

/**
 * Get all toggle settings
 */
export const getToggleSettings = (): ToggleSettingConfig[] => {
  return settingConfigs.filter((config) => config.type === 'toggle') as ToggleSettingConfig[]
}
