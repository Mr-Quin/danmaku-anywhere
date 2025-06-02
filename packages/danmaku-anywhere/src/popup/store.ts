import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type {
  DanmakuSourceType,
  RemoteDanmakuSourceType,
} from '@/common/danmaku/enums'
import { danmakuSourceTypeList } from '@/common/danmaku/enums'
import type { KazumiPolicy } from '@/common/options/kazumiPolicy/schema'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfigInput } from '@/common/options/mountConfig/schema'
import { createSelectors } from '@/common/utils/createSelectors'
import type { Season } from '@danmaku-anywhere/danmaku-converter'

interface StoreState {
  mount: {
    filter: string
    setFilter: (filter: string) => void
    isMounted: boolean
    setIsMounted: (isMounted: boolean) => void
  }
  drawer: {
    open: boolean
    setOpen: (open: boolean) => void
  }
  search: {
    searchParams?: SearchEpisodesQuery
    setSearchParams: (params?: SearchEpisodesQuery) => void
    keyword: string
    setKeyword: (keyword: string) => void
    season?: Season
    setSeason: (season: Season) => void
    tab?: RemoteDanmakuSourceType
    setTab: (tab: RemoteDanmakuSourceType) => void
  }
  danmaku: {
    animeFilter: string
    setAnimeFilter: (filter: string) => void
    selectedTypes: DanmakuSourceType[]
    setSelectedType: (type: DanmakuSourceType[]) => void
    showUploadDialog: boolean
    toggleUploadDialog: (show?: boolean) => void
    showConfirmDeleteDialog: boolean
    setShowConfirmDeleteDialog: (show: boolean) => void
    selectedEpisodes: number[]
    setSelectedEpisodes: (episodes: number[]) => void
    enableEpisodeSelection: boolean
    toggleEpisodeSelection: (enable?: boolean) => void
  }
  config: {
    editingConfig: MountConfigInput & { id?: string }
    setEditingConfig: (config: MountConfigInput & { id?: string }) => void
    showConfirmDeleteDialog: boolean
    setShowConfirmDeleteDialog: (show: boolean) => void
  }
  player: {
    keyword: string
    setKeyword: (keyword: string) => void
    kazumiPolicy?: KazumiPolicy
    setKazumiPolicy: (policy: KazumiPolicy) => void
  }
}

const useStoreBase = create<StoreState>()(
  immer((set) => ({
    mount: {
      filter: '',
      setFilter: (filter: string) => {
        set((state) => {
          state.mount.filter = filter
        })
      },
      isMounted: false,
      setIsMounted: (isMounted: boolean) => {
        set((state) => {
          state.mount.isMounted = isMounted
        })
      },
    },
    drawer: {
      open: true,
      setOpen: (open: boolean) => {
        set((state) => {
          state.drawer.open = open
        })
      },
    },
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
      season: undefined,
      setSeason: (season: Season) =>
        set((state) => {
          state.search.season = season
        }),
      tab: undefined,
      setTab: (tab: RemoteDanmakuSourceType) =>
        set((state) => {
          state.search.tab = tab
        }),
    },
    danmaku: {
      animeFilter: '',
      setAnimeFilter: (filter: string) => {
        set((state) => {
          state.danmaku.animeFilter = filter
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
      enableEpisodeSelection: false,
      toggleEpisodeSelection: (enable?: boolean) => {
        set((state) => {
          state.danmaku.enableEpisodeSelection =
            enable ?? !state.danmaku.enableEpisodeSelection
        })
      },
      selectedEpisodes: [],
      setSelectedEpisodes: (episodes: number[]) => {
        set((state) => {
          state.danmaku.selectedEpisodes = episodes
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
    player: {
      keyword: '',
      setKeyword: (keyword: string) => {
        set((state) => {
          state.player.keyword = keyword
        })
      },
      kazumiPolicy: undefined,
      setKazumiPolicy: (policy: KazumiPolicy) => {
        set((state) => {
          state.player.kazumiPolicy = policy
        })
      },
    },
  }))
)

export const useStore = createSelectors(useStoreBase)
