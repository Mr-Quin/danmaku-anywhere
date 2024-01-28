import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

interface StoreState {
  animeSearchResults: DanDanAnime[] | undefined
  tabUrl: string
  isLoading: boolean
}
export const useStore = create<StoreState>(() => ({
  animeSearchResults: undefined,
  tabUrl: '',
  isLoading: false,
}))
