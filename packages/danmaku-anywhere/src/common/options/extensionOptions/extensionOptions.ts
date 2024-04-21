import type { Options } from '../../services/SyncOptionsService'

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
}

export type ExtensionOptionsOptions = Options<ExtensionOptions>

export const defaultExtensionOptions: ExtensionOptions = {
  enabled: true,
  lang: Language.zh,
}
