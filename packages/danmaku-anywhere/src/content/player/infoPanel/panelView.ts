import { i18n } from '@/common/localization/i18n'
import type { PanelSubstate } from '@/common/rpcClient/background/types'

export type PanelSeverity = 'neutral' | 'info' | 'success' | 'danger'

export interface PanelView {
  severity: PanelSeverity
  /** The status headline shown in the panel header. */
  headline: () => string
  /** Whether the title/episode block is meaningful in this substate. */
  showMedia: boolean
  /** Whether the comment count is meaningful in this substate. */
  showCount: boolean
  /** Whether the status dot animates (in-progress states). */
  pulse: boolean
}

// Literal i18n keys per substate so the extractor can find them statically.
const VIEW: Record<PanelSubstate, PanelView> = {
  loading: {
    severity: 'neutral',
    headline: () => i18n.t('infoPanel.state.loading', 'Searching'),
    showMedia: false,
    showCount: false,
    pulse: true,
  },
  matched: {
    severity: 'info',
    headline: () => i18n.t('infoPanel.state.matched', 'Matched'),
    showMedia: true,
    showCount: false,
    pulse: true,
  },
  mounted: {
    severity: 'success',
    headline: () => i18n.t('infoPanel.state.mounted', 'Mounted'),
    showMedia: true,
    showCount: true,
    pulse: false,
  },
  noMatch: {
    severity: 'neutral',
    headline: () => i18n.t('infoPanel.state.noMatch', 'No match'),
    showMedia: false,
    showCount: false,
    pulse: false,
  },
  error: {
    severity: 'danger',
    headline: () => i18n.t('infoPanel.state.error', 'Error'),
    showMedia: true,
    showCount: false,
    pulse: false,
  },
  disconnected: {
    severity: 'danger',
    headline: () => i18n.t('infoPanel.state.disconnected', 'Disconnected'),
    showMedia: false,
    showCount: false,
    pulse: false,
  },
}

export function panelView(state: PanelSubstate): PanelView {
  return VIEW[state]
}
