import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { create } from 'zustand'

import type { Danmaku, DanmakuLite } from '@/common/danmaku/models/danmaku'
import { danmakuToString } from '@/common/danmaku/utils'
import { createSelectors } from '@/common/utils/createSelectors'
import type { MediaInfo } from '@/content/danmaku/integration/models/MediaInfo'

interface StoreState {
  /**
   * Whether to enable the danmaku feature
   * If off, the popup will work, but danmaku will not be displayed
   * This is separate from the extension options
   */
  enabled: boolean
  toggleEnabled: (enabled?: boolean) => void

  /**
   * Danmaku to be displayed
   */
  comments: CommentEntity[]
  hasComments: boolean
  setComments: (comments: CommentEntity[]) => void
  unsetComments: () => void

  /**
   * Information about the current danmaku
   */
  danmakuLite?: DanmakuLite
  setDanmakuLite: (danmakuMeta: DanmakuLite | undefined) => void

  /**
   * Media information for pages with integration
   */
  mediaInfo?: MediaInfo
  setMediaInfo: (mediaInfo: MediaInfo) => void

  /**
   * Whether the danmaku is manually set
   * When true, automatic danmaku fetching is disabled
   */
  manual: boolean
  toggleManualMode: (manual?: boolean) => void
  mountManual: (danmaku: Danmaku) => void
  unmountManual: () => void

  /**
   * Reset media related state
   * Includes comments, mediaInfo, and danmakuMeta
   */
  resetMediaState: (mediaInfo?: MediaInfo) => void

  /**
   * Uses the mediaInfo and danmakuMeta to get the name
   */
  getAnimeName: () => string
}

const useStoreBase = create<StoreState>((set, get) => ({
  enabled: true,
  toggleEnabled: (enabled) => {
    if (enabled !== undefined) {
      set({ enabled })
    }
    set({ enabled: !get().enabled })
  },

  comments: [],
  hasComments: false,
  setComments: (comments) => set({ comments, hasComments: true }),
  unsetComments: () => set({ comments: [], hasComments: false }),

  manual: false,
  toggleManualMode: (manual) => {
    if (manual === undefined) {
      set((state) => ({ manual: !state.manual }))
    } else {
      set({ manual })
    }
  },
  mountManual: (danmaku) => {
    get().resetMediaState()
    get().toggleManualMode(true)
    get().setComments(danmaku.comments)
    get().setDanmakuLite(danmaku)
  },
  unmountManual: () => {
    get().resetMediaState()
    get().toggleManualMode(false)
    get().unsetComments()
  },

  mediaInfo: undefined,
  setMediaInfo: (mediaInfo) => set({ mediaInfo }),

  danmakuLite: undefined,
  setDanmakuLite: (danmakuLite) => set({ danmakuLite }),

  resetMediaState: (mediaInfo) => {
    get().unsetComments()
    get().setDanmakuLite(undefined)
    set({
      mediaInfo: mediaInfo,
    })
  },

  getAnimeName: () => {
    const { mediaInfo, danmakuLite } = get()
    if (mediaInfo) return mediaInfo.toString()
    if (danmakuLite) {
      return danmakuToString(danmakuLite)
    }
    return 'Unknown anime'
  },
}))

export const useStore = createSelectors(useStoreBase)
