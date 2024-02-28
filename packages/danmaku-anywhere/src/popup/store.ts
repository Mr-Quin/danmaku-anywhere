import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

interface StoreState {
  animeSearchParams?: DanDanAnimeSearchAPIParams
}
export const useStore = create<StoreState>(() => ({
  animeSearchParams: undefined,
}))
