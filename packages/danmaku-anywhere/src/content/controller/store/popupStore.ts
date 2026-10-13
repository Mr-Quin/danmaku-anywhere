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
  TitleMapping = 'titleMapping',
}

/**
 * Seasons offered for one episode the integration could not match on its own.
 * The integration that offers it decides what applying a season does, and
 * withdraws the offer once that episode is no longer on the page.
 */
export interface SeasonSelection {
  id: number
  label: string
  seasons: Season[]
  apply: (season: Season) => Promise<void>
}

interface PopupStoreState {
  isOpen: boolean
  toggleOpen: (open?: boolean) => void
  lock: boolean
  toggleLock: (lock?: boolean) => void

  open: (params?: { tab?: PopupTab }) => void

  selection?: SeasonSelection
  offerSelection: (selection: SeasonSelection) => void
  withdrawSelection: (selection: SeasonSelection) => void
  // Closes the selector after a season was applied, unless the popup has
  // moved on to another offer or tab since.
  closeSelection: (selection: SeasonSelection) => void

  selectedProviders: DanmakuSourceType[]
  setSelectedProviders: (providers: DanmakuSourceType[]) => void

  searchTitle: string
  setSearchTitle: (title: string) => void

  tab: PopupTab
  setTab: (tab: PopupTab) => void

  highlighterPortal: HTMLElement | null
  setHighlighterPortal: (portal: HTMLElement | null) => void

  searchFocusToken: number
  triggerSearchFocus: () => void
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
  open: ({ tab } = {}) => {
    const state = get()
    if (!state.isOpen) {
      set({ isOpen: true })
    }
    if (tab && state.tab !== tab) {
      set({ tab })
    }
  },

  selection: undefined,
  offerSelection: (selection) => {
    set({ selection, isOpen: true, tab: PopupTab.Selector })
  },
  withdrawSelection: (selection) => {
    if (get().selection === selection) {
      set({ selection: undefined })
    }
  },
  closeSelection: (selection) => {
    const state = get()
    if (state.selection !== selection) {
      return
    }
    if (state.isOpen && state.tab === PopupTab.Selector) {
      set({ selection: undefined, isOpen: false, tab: PopupTab.Search })
      return
    }
    set({ selection: undefined })
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

  searchFocusToken: 0,
  triggerSearchFocus: () => {
    set({ searchFocusToken: get().searchFocusToken + 1 })
  },
}))

export const usePopup = createSelectors(usePopupStoreBase)
