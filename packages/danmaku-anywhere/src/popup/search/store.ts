import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

export interface StoreState {
  animeSearchResults: DanDanAnime[] | null
}
export const useStore = create<StoreState>(() => ({
  animeSearchResults: null,
}))
