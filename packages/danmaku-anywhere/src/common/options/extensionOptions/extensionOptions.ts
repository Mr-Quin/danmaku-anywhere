import type { Options } from '../../services/SyncOptionsService/types'

import { Language } from '@/common/localization/language'

export interface ExtensionOptions {
  /**
   * Whether the extension is enabled
   * Does not affect content script registration.
   * Content script is only visually hidden when disabled
   */
  readonly enabled: boolean

  /**
   * Language of the extension
   */
  readonly lang: Language

  readonly danmakuSources: {
    readonly dandanplay: {
      readonly baseUrl: string
    }
  }
}

export type ExtensionOptionsOptions = Options<ExtensionOptions>

export const defaultExtensionOptions: ExtensionOptions = {
  enabled: true,
  lang: Language.zh,
  danmakuSources: {
    dandanplay: {
      baseUrl: 'https://api.dandanplay.net',
    },
  },
}
