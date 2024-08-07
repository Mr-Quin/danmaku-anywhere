import type { CachedComment } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

import type { PlaybackStatus } from '../danmaku/integration/MediaObserver'

import { IntegrationType } from '@/common/danmaku/enums'
import type { DanmakuMeta } from '@/common/danmaku/models/danmakuMeta'
import { danmakuMetaToString } from '@/common/danmaku/utils'
import { createSelectors } from '@/common/utils/createSelectors'
import type { MediaInfo } from '@/content/danmaku/integration/MediaInfo'

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
  comments: CachedComment[]
  hasComments: boolean
  setComments: (comments: CachedComment[]) => void
  unsetComments: () => void

  /**
   * The current video playback status
   */
  playbackStatus: PlaybackStatus
  setPlaybackStatus: (status: PlaybackStatus) => void

  /**
   * Information about the current danmaku
   */
  danmakuMeta?: DanmakuMeta
  setDanmakuMeta: (danmakuMeta: DanmakuMeta | undefined) => void

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
  mountManual: (comments: CachedComment[], danmakuMeta: DanmakuMeta) => void
  unmountManual: () => void

  /**
   * The active integration observer for pages with integration
   */
  integration: IntegrationType
  setIntegration: (integration?: IntegrationType) => void

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
  mountManual: (comments, danmakuMeta) => {
    get().resetMediaState()
    get().toggleManualMode(true)
    get().setComments(comments)
    get().setDanmakuMeta(danmakuMeta)
  },
  unmountManual: () => {
    get().resetMediaState()
    get().toggleManualMode(false)
    get().unsetComments()
  },

  mediaInfo: undefined,
  setMediaInfo: (mediaInfo) => set({ mediaInfo }),

  playbackStatus: 'stopped',
  setPlaybackStatus: (status) => set({ playbackStatus: status }),

  danmakuMeta: undefined,
  setDanmakuMeta: (danmakuMeta) => set({ danmakuMeta }),

  integration: IntegrationType.None,
  setIntegration: (integration) => set({ integration }),

  resetMediaState: (mediaInfo) => {
    get().unsetComments()
    get().setDanmakuMeta(undefined)
    set({
      mediaInfo: mediaInfo,
    })
  },

  getAnimeName: () => {
    const { mediaInfo, danmakuMeta } = get()
    if (mediaInfo) return mediaInfo.toString()
    if (danmakuMeta) {
      return danmakuMetaToString(danmakuMeta)
    }
    return 'Unknown anime'
  },
}))

export const useStore = createSelectors(useStoreBase)
