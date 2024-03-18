import type { Options } from '../services/SyncOptionsService'

export interface ExtensionOptions {
  /**
   * Whether the extension is enabled
   * Does not affect content script registration.
   * Content script is only visually hidden when disabled
   */
  enabled: boolean
}

export type ExtensionOptionsOptions = Options<ExtensionOptions>

export const defaultExtensionOptions: ExtensionOptions = {
  enabled: true,
}
