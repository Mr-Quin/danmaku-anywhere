import type { ExtensionOptions } from './schema'

export const INFO_PANEL_ENABLED_BY_DEFAULT = false

export function isInfoPanelEnabled(
  infoPanel: ExtensionOptions['infoPanel'],
  enabledByDefault = INFO_PANEL_ENABLED_BY_DEFAULT
): boolean {
  return infoPanel.enabled ?? enabledByDefault
}
