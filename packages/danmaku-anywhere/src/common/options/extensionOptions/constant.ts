import { IS_DA_DEV } from '@/common/constants'
import { Language } from '@/common/localization/language'
import { defaultKeymap } from '@/common/options/extensionOptions/hotkeys'
import type { ExtensionOptions } from '@/common/options/extensionOptions/schema'
import { ColorMode } from '@/common/theme/enums'

export const defaultExtensionOptions: ExtensionOptions = {
  enabled: true,
  debug: IS_DA_DEV,
  lang: Language.zh,
  searchUsingSimplified: false,
  retentionPolicy: {
    enabled: false,
    deleteCommentsAfter: 30,
  },
  // danmakuSources removed - now managed in separate provider config storage
  playerOptions: {
    showSkipButton: true,
    showDanmakuTimeline: true,
    enableFullscreenInteraction: true,
  },
  theme: {
    colorMode: ColorMode.System,
  },
  matchLocalDanmaku: true,
  hotkeys: defaultKeymap,
  showReleaseNotes: false,
  enableAnalytics: true,
  id: undefined,
  restrictInitiatorDomain: true,
  showFloatingButton: true,
  autoBookmark: false,
  infoPanel: {
    enabled: true,
  },
}
