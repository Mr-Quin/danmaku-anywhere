import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

export enum PopupTab {
  Info = 'info',
  Search = 'search',
  Selector = 'selector',
}

interface PopupStoreState {
  key: any
  isOpen: boolean
  animes: DanDanAnime[]
  setAnimes: (animes: DanDanAnime[]) => void
  searchTitle: string
  setSearchTitle: (title: string) => void
  tab: PopupTab
  setTab: (tab: PopupTab) => void
  open: (params: { animes?: DanDanAnime[]; tab?: PopupTab }) => void
  close: () => void
}

export const usePopup = create<PopupStoreState>((set) => ({
  isOpen: false,
  key: 0,
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
  open: ({ animes = [], tab }) => {
    set({ isOpen: true, animes: animes })
    if (tab) set({ tab })
  },
  close: () => {
    set({ isOpen: false })
  },
}))
