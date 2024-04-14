import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { produce } from 'immer'
import { create } from 'zustand'

import type { MountConfig } from '@/common/options/mountConfig/mountConfig'
import { createMountConfig } from '@/common/options/mountConfig/mountConfig'
import { createSelectors } from '@/common/utils/createSelectors'

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
  config: {
    editingConfig: MountConfig
    setEditingConfig: (config: MountConfig) => void
    showConfirmDeleteDialog: boolean
    setShowConfirmDeleteDialog: (show: boolean) => void
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
  config: {
    editingConfig: createMountConfig(''),
    setEditingConfig: (config: MountConfig) => {
      set(
        produce((state) => {
          state.config.editingConfig = config
        })
      )
    },
    showConfirmDeleteDialog: false,
    setShowConfirmDeleteDialog: (show: boolean) => {
      set(
        produce((state) => {
          state.config.showConfirmDeleteDialog = show
        })
      )
    },
  },
}))

export const useStore = createSelectors(useStoreBase)
