import type { PanelStateSnapshot } from '@/common/rpcClient/background/types'
import { usePanelStateStore } from './panelStateStore'

function formatLabel(snapshot: PanelStateSnapshot): string {
  if (snapshot.media) {
    const parts: string[] = [snapshot.media.title]
    if (snapshot.media.seasonDecorator) {
      parts.push(`S${snapshot.media.seasonDecorator}`)
    }
    parts.push(`EP${snapshot.media.episode}`)
    if (snapshot.state === 'mounted' && snapshot.commentCount !== undefined) {
      parts.push(`(${snapshot.commentCount})`)
    }
    return parts.join(' · ')
  }
  return snapshot.state
}

export function PlayerInfoPanel() {
  const snapshot = usePanelStateStore((s) => s.snapshot)
  const active = usePanelStateStore((s) => s.active)

  if (!snapshot || !snapshot.enabled || snapshot.isManual) {
    return null
  }

  const className = active ? 'da-info-panel is-visible' : 'da-info-panel'

  return (
    <div className={className} data-da-info-state={snapshot.state}>
      <span className="da-info-panel-dot" />
      <span className="da-info-panel-label">{formatLabel(snapshot)}</span>
    </div>
  )
}
