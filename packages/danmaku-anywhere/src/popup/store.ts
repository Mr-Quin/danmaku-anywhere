import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { MountConfig } from '@/common/options/mountConfig/mountConfig'
import { createMountConfig } from '@/common/options/mountConfig/mountConfig'
import type { DanmakuType } from '@/common/types/danmaku/Danmaku'
import { danmakuTypeList } from '@/common/types/danmaku/Danmaku'
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
    selectedTypes: DanmakuType[]
    setSelectedType: (type: DanmakuType[]) => void
    showUploadDialog: boolean
    toggleUploadDialog: (show?: boolean) => void
  }
  config: {
    editingConfig: MountConfig
    setEditingConfig: (config: MountConfig) => void
    showConfirmDeleteDialog: boolean
    setShowConfirmDeleteDialog: (show: boolean) => void
  }
}

const useStoreBase = create<StoreState>()(
  immer((set) => ({
    animeSearchParams: undefined,
    danmaku: {
      animeFilter: '',
      setAnimeFilter: (filter: string) => {
        set((state) => {
          state.danmaku.animeFilter = filter
        })
      },
      selectedAnime: '',
      setSelectedAnime: (anime: string) => {
        set((state) => {
          state.danmaku.selectedAnime = anime
        })
      },
      selectedEpisode: '',
      setSelectedEpisode: (episode: string) => {
        set((state) => {
          state.danmaku.selectedEpisode = episode
        })
      },
      selectedTypes: danmakuTypeList,
      setSelectedType: (type) => {
        set((state) => {
          state.danmaku.selectedTypes = type
        })
      },
      showUploadDialog: false,
      toggleUploadDialog: (show?: boolean) => {
        set((state) => {
          state.danmaku.showUploadDialog =
            show ?? !state.danmaku.showUploadDialog
        })
      },
    },
    config: {
      editingConfig: createMountConfig(''),
      setEditingConfig: (config: MountConfig) => {
        set((state) => {
          state.config.editingConfig = config
        })
      },
      showConfirmDeleteDialog: false,
      setShowConfirmDeleteDialog: (show: boolean) => {
        set((state) => {
          state.config.showConfirmDeleteDialog = show
        })
      },
    },
  }))
)

export const useStore = createSelectors(useStoreBase)
