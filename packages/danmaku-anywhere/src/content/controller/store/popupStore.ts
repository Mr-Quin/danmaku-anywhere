import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { create } from 'zustand'
import {
  type DanmakuSourceType,
  danmakuSourceTypeList,
} from '@/common/danmaku/enums'
import { createSelectors } from '@/common/utils/createSelectors'

export enum PopupTab {
  Debug = 'debug',
  Search = 'search',
  Selector = 'selector',
  Comments = 'comments',
  Mount = 'mount',
  Styles = 'styles',
  Policy = 'policy',
  Import = 'import',
  Filter = 'filter',
}

interface PopupStoreState {
  isOpen: boolean
  toggleOpen: (open?: boolean) => void
  lock: boolean
  toggleLock: (lock?: boolean) => void

  open: (params?: { animes?: Season[]; tab?: PopupTab }) => void

  animes: Season[]
  setAnimes: (animes: Season[]) => void

  selectedProviders: DanmakuSourceType[]
  setSelectedProviders: (providers: DanmakuSourceType[]) => void

  searchTitle: string
  setSearchTitle: (title: string) => void

  tab: PopupTab
  setTab: (tab: PopupTab) => void

  highlighterPortal: HTMLElement | null
  setHighlighterPortal: (portal: HTMLElement | null) => void
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

  selectedProviders: danmakuSourceTypeList,
  setSelectedProviders: (providers) => {
    set({ selectedProviders: providers })
  },

  searchTitle: '',
  setSearchTitle: (title) => {
    set({ searchTitle: title })
  },
  tab: PopupTab.Mount,
  setTab: (tab) => {
    set({ tab })
  },

  highlighterPortal: null,
  setHighlighterPortal: (portal) => {
    set({ highlighterPortal: portal })
  },
}))

export const usePopup = createSelectors(usePopupStoreBase)
