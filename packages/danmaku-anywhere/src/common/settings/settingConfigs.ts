import { describeError } from '@/common/errors/describeError'
import { i18n } from '@/common/localization/i18n'
import { useToast } from '../components/Toast/toastStore'
import { isInfoPanelEnabled } from '../options/extensionOptions/infoPanel'
import type { ExtensionOptions } from '../options/extensionOptions/schema'
import { chromeRpcClient } from '../rpcClient/background/client'
import { copyToClipboard } from '../utils/copyToClipboard'
import { tryCatch } from '../utils/tryCatch'

// Category for UI grouping
export type SettingCategory = 'advanced' | 'player' | 'general'

// Sub-group within the Advanced page
export type AdvancedGroup = 'behavior' | 'privacy' | 'diagnostics'

type CommonSettingConfig = {
  // Unique command ID for this setting
  id: string
  // Category for UI grouping
  category: SettingCategory
  // Sub-group within a page (currently only the Advanced page uses this)
  group?: AdvancedGroup
  // Label or translation key for the setting
  label: () => string
  // Optional one-line description shown under the label
  description?: () => string
}

export type ToggleSettingConfig<S> = CommonSettingConfig & {
  type: 'toggle'
  getValue: (state: S) => boolean
  createUpdate: (state: S, newValue: boolean) => Partial<S>
}

export type ButtonSettingConfig = CommonSettingConfig & {
  type: 'button'
  handler: () => void | Promise<void>
}

export type SettingConfig<S> = ToggleSettingConfig<S> | ButtonSettingConfig

// Every Advanced-page config must declare a group so it lands in a section.
type AdvancedSettingConfig = SettingConfig<ExtensionOptions> & {
  group: AdvancedGroup
}

const uploadDebugDataButton: AdvancedSettingConfig = {
  id: 'button.uploadDebugData',
  label: () => i18n.t('optionsPage.uploadDebugData', 'Submit Debug Data'),
  description: () =>
    i18n.t(
      'optionsPage.uploadDebugDataDesc',
      'Upload diagnostics and copy a reference ID.'
    ),
  category: 'advanced',
  group: 'diagnostics',
  type: 'button',
  handler: async () => {
    const [result, error] = await tryCatch(() =>
      chromeRpcClient.exportDebugData()
    )
    if (error) {
      useToast.getState().toast.error(describeError(error).message)
    } else {
      useToast.getState().toast.success(
        i18n.t('optionsPage.uploadDebugDataSuccess', 'Submitted {{ id }}', {
          id: result.data.id,
        }),
        {
          actionFn: () => {
            copyToClipboard(result.data.id)
          },
          actionLabel: i18n.t('common.copy', 'Copy'),
          duration: 10000,
        }
      )
    }
  },
}

const advancedSettings: AdvancedSettingConfig[] = [
  {
    id: 'toggle.player.enableFullscreenInteraction',
    label: () =>
      i18n.t(
        'optionsPage.enableFullscreenInteraction',
        'Enable fullscreen interaction'
      ),
    description: () =>
      i18n.t(
        'optionsPage.enableFullscreenInteractionDesc',
        'Keep danmaku controls reachable in fullscreen.'
      ),
    category: 'advanced',
    group: 'behavior',
    type: 'toggle',
    getValue: (options) => options.playerOptions.enableFullscreenInteraction,
    createUpdate: (options, newValue) => ({
      playerOptions: {
        ...options.playerOptions,
        enableFullscreenInteraction: newValue,
      },
    }),
  },
  {
    id: 'toggle.matchLocalDanmaku',
    label: () =>
      i18n.t('optionsPage.matchLocalDanmaku', 'Enable matching local Danmaku'),
    description: () =>
      i18n.t(
        'optionsPage.matchLocalDanmakuDesc',
        'Auto-match comments from local files on disk.'
      ),
    category: 'advanced',
    group: 'behavior',
    type: 'toggle',
    getValue: (options) => options.matchLocalDanmaku,
    createUpdate: (_, newValue) => ({ matchLocalDanmaku: newValue }),
  },
  {
    id: 'toggle.showFloatingButton',
    label: () =>
      i18n.t('optionsPage.showFloatingButton', 'Show floating button'),
    description: () =>
      i18n.t(
        'optionsPage.showFloatingButtonDesc',
        'Show the quick-action button on video pages.'
      ),
    category: 'advanced',
    group: 'behavior',
    type: 'toggle',
    getValue: (options) => options.showFloatingButton,
    createUpdate: (_, newValue) => ({ showFloatingButton: newValue }),
  },
  {
    id: 'toggle.searchUsingSimplified',
    label: () =>
      i18n.t(
        'optionsPage.searchUsingSimplified',
        'Search using simplified Chinese'
      ),
    description: () =>
      i18n.t(
        'optionsPage.searchUsingSimplifiedDesc',
        'Convert Traditional to Simplified when searching.'
      ),
    category: 'advanced',
    group: 'behavior',
    type: 'toggle',
    getValue: (options) => options.searchUsingSimplified,
    createUpdate: (_, newValue) => ({ searchUsingSimplified: newValue }),
  },
  {
    id: 'toggle.analytics',
    label: () =>
      i18n.t(
        'optionsPage.enableAnalytics',
        'Share usage data with Microsoft Clarity'
      ),
    description: () =>
      i18n.t(
        'optionsPage.enableAnalyticsDesc',
        'Records how you use the extension, including on pages where its in-page controls run, and sends it to Microsoft Clarity. Turn this off to stop sending it.'
      ),
    category: 'advanced',
    group: 'privacy',
    type: 'toggle',
    getValue: (options) => options.enableAnalytics,
    createUpdate: (_, newValue) => ({ enableAnalytics: newValue }),
  },
  {
    id: 'toggle.restrictInitiatorDomain',
    label: () =>
      i18n.t(
        'optionsPage.restrictInitiatorDomain',
        'Only modify requests made by this extension'
      ),
    description: () =>
      i18n.t(
        'optionsPage.restrictInitiatorDomainDesc',
        'Restrict network-rule scope to this extension.'
      ),
    category: 'advanced',
    group: 'privacy',
    type: 'toggle',
    getValue: (options) => options.restrictInitiatorDomain,
    createUpdate: (_, newValue) => ({ restrictInitiatorDomain: newValue }),
  },
  {
    id: 'toggle.debug',
    label: () => i18n.t('optionsPage.debugLogging', 'Debug logging'),
    description: () =>
      i18n.t(
        'optionsPage.debugLoggingDesc',
        'Verbose logs in the developer console.'
      ),
    category: 'advanced',
    group: 'diagnostics',
    type: 'toggle',
    getValue: (options) => options.debug,
    createUpdate: (_, newValue) => ({ debug: newValue }),
  },
  {
    id: 'toggle.autoBookmark',
    label: () =>
      i18n.t(
        'optionsPage.autoBookmark',
        'Follow automatically when preloading the next episode'
      ),
    description: () =>
      i18n.t(
        'optionsPage.autoBookmarkDesc',
        "Follow a show once you are halfway through an episode, so the next episode's danmaku is preloaded."
      ),
    category: 'advanced',
    group: 'behavior',
    type: 'toggle',
    getValue: (options) => options.autoBookmark,
    createUpdate: (_, newValue) => ({ autoBookmark: newValue }),
  },
  uploadDebugDataButton,
]

const playerSettings: ToggleSettingConfig<ExtensionOptions>[] = [
  {
    id: 'toggle.player.showSkipButton',
    label: () =>
      i18n.t('optionsPage.player.showSkipButton', 'Show skip button (OP/ED)'),
    description: () =>
      i18n.t(
        'optionsPage.player.showSkipButtonDesc',
        'Surface a one-tap skip during intro and outro segments.'
      ),
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
    label: () =>
      i18n.t('optionsPage.player.showDanmakuTimeline', 'Show danmaku density'),
    description: () =>
      i18n.t(
        'optionsPage.player.showDanmakuTimelineDesc',
        'Draw a comment-density graph along the bottom edge of the video.'
      ),
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
  {
    id: 'toggle.infoPanel.enabled',
    label: () => i18n.t('optionsPage.infoPanel.enabled', 'Show info panel'),
    description: () =>
      i18n.t(
        'optionsPage.infoPanel.enabledDesc',
        'Overlay a card on the video with the mounted episode and comment count.'
      ),
    category: 'player',
    type: 'toggle',
    getValue: (options) => isInfoPanelEnabled(options.infoPanel),
    createUpdate: (options, newValue) => ({
      infoPanel: { ...options.infoPanel, enabled: newValue },
    }),
  },
]

export const settingConfigs = {
  advanced: advancedSettings,
  player: playerSettings,
}
