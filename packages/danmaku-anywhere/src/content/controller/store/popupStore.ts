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
 * withdraws the offer once that episode is no longer on the page. The selector
 * tab stays available while an offer is up.
 */
export interface SeasonOffer {
  label: string
  seasons: Season[]
  apply: (season: Season) => Promise<void>
}

export interface SeasonSelection extends SeasonOffer {
  id: number
}

interface PopupStoreState {
  isOpen: boolean
  toggleOpen: (open?: boolean) => void
  lock: boolean
  toggleLock: (lock?: boolean) => void

  open: (params?: { tab?: PopupTab }) => void

  selection?: SeasonSelection
  lastSelectionId: number
  offerSelection: (offer: SeasonOffer) => SeasonSelection
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
    set({ isOpen: open ?? !get().isOpen })
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
  lastSelectionId: 0,
  offerSelection: (offer) => {
    const selection = { ...offer, id: get().lastSelectionId + 1 }
    set({
      selection,
      lastSelectionId: selection.id,
      isOpen: true,
      tab: PopupTab.Selector,
    })
    return selection
  },
  withdrawSelection: (selection) => {
    const state = get()
    if (state.selection !== selection) {
      return
    }
    set({
      selection: undefined,
      tab: state.tab === PopupTab.Selector ? PopupTab.Search : state.tab,
    })
  },
  closeSelection: (selection) => {
    const state = get()
    if (state.selection !== selection) {
      return
    }
    if (state.tab === PopupTab.Selector) {
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
