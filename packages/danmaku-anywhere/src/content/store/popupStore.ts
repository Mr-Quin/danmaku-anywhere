import type { DanDanAnime } from '@danmaku-anywhere/dandanplay-api'
import { create } from 'zustand'

export enum PopupTab {
  Info = 'debug',
  Search = 'search',
  Selector = 'selector',
  Comments = 'comments',
  Mount = 'mount',
}

interface PopupStoreState {
  isOpen: boolean
  toggleOpen: (open?: boolean) => void
  open: (params?: { animes?: DanDanAnime[]; tab?: PopupTab }) => void

  animes: DanDanAnime[]
  setAnimes: (animes: DanDanAnime[]) => void

  searchTitle: string
  setSearchTitle: (title: string) => void

  tab: PopupTab
  setTab: (tab: PopupTab) => void

  saveMapping: boolean
  setSaveMapping: (saving: boolean) => void
}

export const usePopup = create<PopupStoreState>((set, get) => ({
  isOpen: false,
  toggleOpen: (open) => {
    const nextOpen = open ?? !get().isOpen
    if (get().tab === PopupTab.Selector) {
      set({ isOpen: nextOpen, tab: PopupTab.Search })
    } else {
      set({ isOpen: nextOpen })
    }
  },
  open: ({ animes = [], tab } = {}) => {
    set({ isOpen: true, animes: animes })
    if (tab) set({ tab })
  },

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
}))
