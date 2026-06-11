import { create } from 'zustand'
import type { PanelStateSnapshot } from '@/common/rpcClient/background/types'
import { createSelectors } from '@/common/utils/createSelectors'

interface PanelStateStore {
  snapshot: PanelStateSnapshot | undefined
  active: boolean
  pipActive: boolean
  setSnapshot: (snapshot: PanelStateSnapshot) => void
  setActive: (active: boolean) => void
  setPipActive: (pipActive: boolean) => void
}

const usePanelStateStoreBase = create<PanelStateStore>()((set) => ({
  snapshot: undefined,
  active: true,
  pipActive: false,
  setSnapshot: (snapshot) => set({ snapshot }),
  setActive: (active) => set({ active }),
  setPipActive: (pipActive) => set({ pipActive }),
}))

export const usePanelStateStore = createSelectors(usePanelStateStoreBase)
