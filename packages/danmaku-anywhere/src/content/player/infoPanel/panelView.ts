import type { PanelSubstate } from '@/common/rpcClient/background/types'

export type PanelSeverity = 'neutral' | 'info' | 'success' | 'danger'

export interface PanelView {
  severity: PanelSeverity
  /** Whether the title/episode block is meaningful in this substate. */
  showMedia: boolean
  /** Whether the comment count is meaningful in this substate. */
  showCount: boolean
  /** Whether the status dot animates (in-progress states). */
  pulse: boolean
}

const VIEW: Record<PanelSubstate, PanelView> = {
  loading: {
    severity: 'neutral',
    showMedia: false,
    showCount: false,
    pulse: true,
  },
  matched: { severity: 'info', showMedia: true, showCount: false, pulse: true },
  mounted: {
    severity: 'success',
    showMedia: true,
    showCount: true,
    pulse: false,
  },
  noMatch: {
    severity: 'neutral',
    showMedia: false,
    showCount: false,
    pulse: false,
  },
  error: {
    severity: 'danger',
    showMedia: true,
    showCount: false,
    pulse: false,
  },
  disconnected: {
    severity: 'danger',
    showMedia: false,
    showCount: false,
    pulse: false,
  },
}

export function panelView(state: PanelSubstate): PanelView {
  return VIEW[state]
}
