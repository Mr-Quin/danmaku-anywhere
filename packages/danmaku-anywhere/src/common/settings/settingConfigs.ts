import type { ExtensionOptions } from '../options/extensionOptions/schema'

// Category for UI grouping
export type SettingCategory = 'advanced' | 'player' | 'general'

type CommonSettingConfig = {
  // Unique command ID for this setting
  id: string
  // Category for UI grouping
  category: SettingCategory
  // Description (translation key)
  descriptionKey?: string
  // Label or translation key for the setting
  label: string
}

export type ToggleSettingConfig<S> = CommonSettingConfig & {
  type: 'toggle'
  getValue: (state: S) => boolean
  createUpdate: (state: S, newValue: boolean) => Partial<S>
}

// Union type for all setting configs
export type SettingConfig<S> = ToggleSettingConfig<S>

const advancedSettings: SettingConfig<ExtensionOptions>[] = [
  {
    id: 'toggle.analytics',
    label: 'optionsPage.enableAnalytics',
    category: 'advanced',
    type: 'toggle',
    getValue: (options) => options.enableAnalytics,
    createUpdate: (_, newValue) => ({ enableAnalytics: newValue }),
  },
  {
    id: 'toggle.debug',
    label: 'Debug',
    category: 'advanced',
    type: 'toggle',
    getValue: (options) => options.debug,
    createUpdate: (_, newValue) => ({ debug: newValue }),
  },
  {
    id: 'toggle.matchLocalDanmaku',
    label: 'optionsPage.matchLocalDanmaku',
    category: 'advanced',
    type: 'toggle',
    getValue: (options) => options.matchLocalDanmaku,
    createUpdate: (_, newValue) => ({ matchLocalDanmaku: newValue }),
  },
  {
    id: 'toggle.searchUsingSimplified',
    label: 'optionsPage.searchUsingSimplified',
    category: 'advanced',
    type: 'toggle',
    getValue: (options) => options.searchUsingSimplified,
    createUpdate: (_, newValue) => ({ searchUsingSimplified: newValue }),
  },
]

const playerSettings: SettingConfig<ExtensionOptions>[] = [
  {
    id: 'toggle.player.showSkipButton',
    label: 'optionsPage.player.showSkipButton',
    category: 'player',
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
    label: 'optionsPage.player.showDanmakuTimeline',
    category: 'player',
    type: 'toggle',
    getValue: (options) => options.playerOptions.showDanmakuTimeline,
    createUpdate: (options, newValue) => ({
      playerOptions: {
        ...options.playerOptions,
        showDanmakuTimeline: newValue,
      },
    }),
  },
]

export const settingConfigs = {
  advanced: advancedSettings,
  player: playerSettings,
}
