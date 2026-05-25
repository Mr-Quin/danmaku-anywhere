import { usePanelStateStore } from './panelStateStore'

export function PlayerInfoPanel() {
  const snapshot = usePanelStateStore((s) => s.snapshot)

  if (!snapshot || !snapshot.enabled || snapshot.isManual) {
    return null
  }

  return (
    <div
      className="da-info-panel"
      data-da-info-state={snapshot.state}
      aria-hidden="true"
    />
  )
}
