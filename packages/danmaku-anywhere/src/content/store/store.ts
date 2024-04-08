import type { DanDanComment } from '@danmaku-anywhere/dandanplay-api'
import { create } from 'zustand'

import type {
  MediaInfo,
  PlaybackStatus,
} from '../danmaku/integration/MediaObserver'

import type { DanmakuMeta } from '@/common/db/db'

interface StoreState {
  /**
   * Danmaku to be displayed
   */
  comments: DanDanComment[]
  setComments: (comments: DanDanComment[]) => void

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
  toggleManualMode: (manual: boolean) => void
  turnOnManualMode: (
    comments: DanDanComment[],
    danmakuMeta: DanmakuMeta
  ) => void
  turnOffManualMode: () => void

  /**
   * The active integration observer for pages with integration
   */
  integration?: string

  /**
   * Reset media related state
   * Includes comments, mediaInfo, and danmakuMeta
   */
  resetMediaState: () => void

  /**
   * Uses the mediaInfo and danmakuMeta to get the name
   */
  getAnimeName: () => string
}

export const useStore = create<StoreState>((set, get) => ({
  comments: [],
  setComments: (comments) => set({ comments }),

  manual: false,
  toggleManualMode: (manual) => set({ manual }),
  turnOnManualMode: (comments, danmakuMeta) => {
    get().resetMediaState()
    set({ manual: true, comments, danmakuMeta })
  },
  turnOffManualMode: () => {
    get().resetMediaState()
    set({ manual: false })
  },

  mediaInfo: undefined,
  setMediaInfo: (mediaInfo) => set({ mediaInfo }),

  playbackStatus: 'stopped',
  setPlaybackStatus: (status) => set({ playbackStatus: status }),

  danmakuMeta: undefined,
  setDanmakuMeta: (danmakuMeta) => set({ danmakuMeta }),

  integration: undefined,

  resetMediaState: () =>
    set({
      comments: [],
      mediaInfo: undefined,
      danmakuMeta: undefined,
    }),

  getAnimeName: () => {
    const { mediaInfo, danmakuMeta } = get()
    if (mediaInfo) return mediaInfo.toString()
    if (danmakuMeta) {
      if (danmakuMeta.episodeTitle) {
        return `${danmakuMeta.animeTitle} - ${danmakuMeta.episodeTitle}`
      }
      return danmakuMeta.animeTitle
    }
    return 'Unknown anime'
  },
}))
