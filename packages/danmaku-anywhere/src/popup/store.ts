import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

export interface StoreState {
  animeSearchResults: DanDanAnime[] | undefined
  tabUrl: string
  isLoadingTabUrl: boolean
}
export const useStore = create<StoreState>(() => ({
  animeSearchResults: undefined,
  tabUrl: '',
  isLoadingTabUrl: false,
}))
