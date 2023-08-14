import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

export interface StoreState {
  animeSearchResults: DanDanAnime[] | undefined
}
export const useStore = create<StoreState>(() => ({
  animeSearchResults: undefined,
}))
