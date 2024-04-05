import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { create } from 'zustand'

interface StoreState {
  animeSearchParams?: DanDanAnimeSearchAPIParams
  isTabConnected: boolean
}
export const useStore = create<StoreState>(() => ({
  animeSearchParams: undefined,
  isTabConnected: false,
}))
