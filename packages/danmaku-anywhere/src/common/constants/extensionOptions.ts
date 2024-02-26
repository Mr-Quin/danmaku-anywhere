import type { Options } from '../services/SyncOptionsService'

export interface ExtensionOptions {
  enabled: boolean
}

export type ExtensionOptionsOptions = Options<ExtensionOptions>

export const defaultExtensionOptions: ExtensionOptions = {
  enabled: true,
}
