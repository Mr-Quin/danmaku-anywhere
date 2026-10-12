import { create } from 'zustand'
import { createSelectors } from '@/common/utils/createSelectors'
import type { PanelEntry, PanelSource } from './panelEntry'

interface PanelStateStore {
  // Each source owns its key; controller-pushed and player-local both write here.
  entries: Partial<Record<PanelSource, PanelEntry>>
  // Panel-wide gate from the infoPanel.enabled setting; covers every source.
  enabled: boolean
  // Idle state from the player, held on for a short intro when content arrives.
  active: boolean
  pipActive: boolean
  setEntry: (source: PanelSource, entry: PanelEntry | undefined) => void
  setEnabled: (enabled: boolean) => void
  setActive: (active: boolean) => void
  setPipActive: (pipActive: boolean) => void
}

const usePanelStateStoreBase = create<PanelStateStore>()((set) => ({
  entries: {},
  enabled: false,
  active: true,
  pipActive: false,
  setEntry: (source, entry) =>
    set((state) => {
      const entries = { ...state.entries }
      if (entry) {
        entries[source] = entry
      } else {
        delete entries[source]
      }
      return { entries }
    }),
  setEnabled: (enabled) => set({ enabled }),
  setActive: (active) => set({ active }),
  setPipActive: (pipActive) => set({ pipActive }),
}))

export const usePanelStateStore = createSelectors(usePanelStateStoreBase)

export function isPanelRendered(
  state: Pick<PanelStateStore, 'enabled' | 'pipActive' | 'entries'>
): boolean {
  return (
    state.enabled &&
    !state.pipActive &&
    Object.values(state.entries).some((entry) => entry !== undefined)
  )
}
