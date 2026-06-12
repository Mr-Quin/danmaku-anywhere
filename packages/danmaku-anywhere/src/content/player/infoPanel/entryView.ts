import { i18n } from '@/common/localization/i18n'
import type { OcclusionState, PanelEntry } from './panelEntry'
import { type PanelSeverity, panelView } from './panelView'

export interface EntryView {
  severity: PanelSeverity
  headline: () => string
  pulse: boolean
}

// Literal i18n keys per state so the extractor can find them statically.
const OCCLUSION_VIEW: Record<OcclusionState, EntryView> = {
  loading: {
    severity: 'info',
    headline: () => i18n.t('infoPanel.occlusion.loading', 'Occlusion starting'),
    pulse: true,
  },
  on: {
    severity: 'success',
    headline: () => i18n.t('infoPanel.occlusion.on', 'Occlusion on'),
    pulse: false,
  },
  error: {
    severity: 'danger',
    headline: () => i18n.t('infoPanel.occlusion.error', 'Occlusion error'),
    pulse: false,
  },
}

/**
 * The shared-chrome view for a row (status dot color/pulse + headline),
 * resolved per source. Pipeline reuses the substate view; occlusion maps its
 * state. Bodies are rendered separately, switched on source.
 */
export function entryView(entry: PanelEntry): EntryView {
  if (entry.source === 'pipeline') {
    const view = panelView(entry.substate)
    return {
      severity: view.severity,
      headline: view.headline,
      pulse: view.pulse,
    }
  }
  return OCCLUSION_VIEW[entry.state]
}
