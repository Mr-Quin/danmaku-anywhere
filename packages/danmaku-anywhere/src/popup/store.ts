import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { DanmakuSourceType } from '@/common/danmaku/enums'
import { danmakuSourceTypeList } from '@/common/danmaku/enums'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfigInput } from '@/common/options/mountConfig/schema'
import { createSelectors } from '@/common/utils/createSelectors'

interface StoreState {
  search: {
    searchParams?: SearchEpisodesQuery
    setSearchParams: (params?: SearchEpisodesQuery) => void
    keyword: string
    setKeyword: (keyword: string) => void
  }
  danmaku: {
    animeFilter: string
    setAnimeFilter: (filter: string) => void
    selectedAnime: string
    setSelectedAnime: (anime: string) => void
    selectedEpisode: string
    setSelectedEpisode: (episode: string) => void
    selectedTypes: DanmakuSourceType[]
    setSelectedType: (type: DanmakuSourceType[]) => void
    showUploadDialog: boolean
    toggleUploadDialog: (show?: boolean) => void
    showConfirmDeleteDialog: boolean
    setShowConfirmDeleteDialog: (show: boolean) => void
  }
  config: {
    editingConfig: MountConfigInput & { id?: string }
    setEditingConfig: (config: MountConfigInput & { id?: string }) => void
    showConfirmDeleteDialog: boolean
    setShowConfirmDeleteDialog: (show: boolean) => void
  }
}

const useStoreBase = create<StoreState>()(
  immer((set) => ({
    search: {
      searchParams: undefined,
      setSearchParams: (params) => {
        set((state) => {
          state.search.searchParams = params
        })
      },
      keyword: '',
      setKeyword: (keyword: string) => {
        set((state) => {
          state.search.keyword = keyword
        })
      },
    },
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
      selectedTypes: danmakuSourceTypeList,
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
      showConfirmDeleteDialog: false,
      setShowConfirmDeleteDialog: (show: boolean) => {
        set((state) => {
          state.danmaku.showConfirmDeleteDialog = show
        })
      },
    },
    config: {
      editingConfig: createMountConfig(''),
      setEditingConfig: (config: MountConfigInput) => {
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
