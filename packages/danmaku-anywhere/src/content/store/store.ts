import { DanDanComment } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

interface StoreState {
  comments: DanDanComment[]
  setComments: (comments: DanDanComment[]) => void
}

export const useStore = create<StoreState>((set) => ({
  comments: [],
  setComments: (comments) => {
    set({ comments })
  },
}))
