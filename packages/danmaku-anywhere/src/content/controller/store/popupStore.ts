import type { DanDanSearchAnimeDetails } from '@danmaku-anywhere/danmaku-provider/ddp'
import { create } from 'zustand'

import { createSelectors } from '@/common/utils/createSelectors'

export enum PopupTab {
  Debug = 'debug',
  Search = 'search',
  Selector = 'selector',
  Comments = 'comments',
  Mount = 'mount',
  Styles = 'styles',
  Policy = 'policy',
}

interface PopupStoreState {
  isOpen: boolean
  toggleOpen: (open?: boolean) => void
  lock: boolean
  toggleLock: (lock?: boolean) => void

  open: (params?: {
    animes?: DanDanSearchAnimeDetails[]
    tab?: PopupTab
  }) => void

  animes: DanDanSearchAnimeDetails[]
  setAnimes: (animes: DanDanSearchAnimeDetails[]) => void

  searchTitle: string
  setSearchTitle: (title: string) => void

  tab: PopupTab
  setTab: (tab: PopupTab) => void

  saveMapping: boolean
  setSaveMapping: (saving: boolean) => void

  highlighterPortal: HTMLElement | null
  setHighlighterPortal: (portal: HTMLElement) => void
}

const usePopupStoreBase = create<PopupStoreState>((set, get) => ({
  isOpen: false,
  toggleOpen: (open) => {
    const nextOpen = open ?? !get().isOpen
    if (get().tab === PopupTab.Selector) {
      set({ isOpen: nextOpen, tab: PopupTab.Search })
    } else {
      set({ isOpen: nextOpen })
    }
  },
  lock: false,
  toggleLock: (lock) => {
    set({ lock: lock ?? !get().lock })
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

  highlighterPortal: null,
  setHighlighterPortal: (portal) => {
    set({ highlighterPortal: portal })
  },
}))

export const usePopup = createSelectors(usePopupStoreBase)
