import type { DanDanAnime } from '@danmaku-anywhere/dandanplay-api'
import { create } from 'zustand'

export enum PopupTab {
  Info = 'info',
  Search = 'search',
  Selector = 'selector',
  Comments = 'comments',
}

interface PopupStoreState {
  isOpen: boolean
  animes: DanDanAnime[]
  setAnimes: (animes: DanDanAnime[]) => void
  searchTitle: string
  setSearchTitle: (title: string) => void
  tab: PopupTab
  setTab: (tab: PopupTab) => void
  saveMapping: boolean
  setSaveMapping: (saving: boolean) => void
  open: (params: { animes?: DanDanAnime[]; tab?: PopupTab }) => void
  close: () => void
}

export const usePopup = create<PopupStoreState>((set) => ({
  isOpen: false,
  animes: [],
  setAnimes: (animes) => {
    set({ animes })
  },
  searchTitle: '',
  setSearchTitle: (title) => {
    set({ searchTitle: title })
  },
  tab: PopupTab.Search,
  setTab: (tab) => {
    set({ tab })
  },
  saveMapping: true,
  setSaveMapping: (saving) => {
    set({ saveMapping: saving })
  },
  open: ({ animes = [], tab }) => {
    set({ isOpen: true, animes: animes })
    if (tab) set({ tab })
  },
  close: () => {
    set({ isOpen: false })
  },
}))
