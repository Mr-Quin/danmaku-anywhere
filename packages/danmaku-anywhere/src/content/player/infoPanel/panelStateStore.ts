import { create } from 'zustand'
import type { PanelStateSnapshot } from '@/common/rpcClient/background/types'

interface PanelStateStore {
  snapshot: PanelStateSnapshot | undefined
  active: boolean
  setSnapshot: (snapshot: PanelStateSnapshot) => void
  setActive: (active: boolean) => void
}

export const usePanelStateStore = create<PanelStateStore>()((set) => ({
  snapshot: undefined,
  active: true,
  setSnapshot: (snapshot) => set({ snapshot }),
  setActive: (active) => set({ active }),
}))
