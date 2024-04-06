import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { produce } from 'immer'
import { create } from 'zustand'

import { createSelectors } from '@/common/createSelectors'

interface StoreState {
  animeSearchParams?: DanDanAnimeSearchAPIParams
  danmaku: {
    animeFilter: string
    setAnimeFilter: (filter: string) => void
    selectedAnime: string
    setSelectedAnime: (anime: string) => void
    selectedEpisode: string
    setSelectedEpisode: (episode: string) => void
  }
}

const useStoreBase = create<StoreState>((set) => ({
  animeSearchParams: undefined,
  danmaku: {
    animeFilter: '',
    setAnimeFilter: (filter: string) => {
      set(
        produce((state) => {
          state.danmaku.animeFilter = filter
        })
      )
    },
    selectedAnime: '',
    setSelectedAnime: (anime: string) => {
      set(
        produce((state) => {
          state.danmaku.selectedAnime = anime
        })
      )
    },
    selectedEpisode: '',
    setSelectedEpisode: (episode: string) => {
      set(
        produce((state) => {
          state.danmaku.selectedEpisode = episode
        })
      )
    },
  },
}))

export const useStore = createSelectors(useStoreBase)
