import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

interface PopupStoreState {
  duration: number
  key: any
  isOpen: boolean
  animes: DanDanAnime[]
  open: (animes: DanDanAnime[]) => void
  close: () => void
}

export const usePopup = create<PopupStoreState>((set) => ({
  isOpen: false,
  duration: 3000,
  key: 0,
  animes: [],
  open: (animes) => {
    set({ isOpen: true, animes: animes })
  },
  close: () => {
    set({ isOpen: false, animes: [] })
  },
}))
