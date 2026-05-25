import { create } from 'zustand'
import type { PanelStateSnapshot } from '@/common/rpcClient/background/types'

interface PanelStateStore {
  snapshot: PanelStateSnapshot | undefined
  setSnapshot: (snapshot: PanelStateSnapshot) => void
}

export const usePanelStateStore = create<PanelStateStore>()((set) => ({
  snapshot: undefined,
  setSnapshot: (snapshot) => set({ snapshot }),
}))
