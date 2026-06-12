import { create } from 'zustand'
import { createSelectors } from '@/common/utils/createSelectors'
import type { PanelEntry, PanelSource } from './panelEntry'

interface PanelStateStore {
  // Each source owns its key. Controller-pushed sources (pipeline) and
  // player-local sources (occlusion) write into the same map; the panel renders
  // the present entries in resolve order.
  entries: Partial<Record<PanelSource, PanelEntry>>
  active: boolean
  pipActive: boolean
  setEntry: (source: PanelSource, entry: PanelEntry | undefined) => void
  setActive: (active: boolean) => void
  setPipActive: (pipActive: boolean) => void
}

const usePanelStateStoreBase = create<PanelStateStore>()((set) => ({
  entries: {},
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
  setActive: (active) => set({ active }),
  setPipActive: (pipActive) => set({ pipActive }),
}))

export const usePanelStateStore = createSelectors(usePanelStateStoreBase)
