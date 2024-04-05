import type { DanDanComment } from '@danmaku-anywhere/dandanplay-api'
import { create } from 'zustand'

import type {
  MediaObserver,
  MediaInfo,
  PlaybackStatus,
} from '../integration/MediaObserver'

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
  turnOnManualMode: (
    comments: DanDanComment[],
    danmakuMeta: DanmakuMeta
  ) => void
  turnOffManualMode: () => void

  /**
   * The active integration observer for pages with integration
   */
  activeObserver?: MediaObserver
  integration?: string
  setObserver: (name: string, observer: MediaObserver) => void
  unsetObserver: () => void

  /**
   * Reset media related state
   * Includes comments, mediaInfo, and danmakuMeta
   */
  resetMediaState: () => void
}

export const useStore = create<StoreState>((set, get) => ({
  comments: [],
  setComments: (comments) => set({ comments }),
  manual: false,
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
  activeObserver: undefined,
  integration: undefined,
  setObserver: (name, observer) =>
    set({ integration: name, activeObserver: observer }),
  unsetObserver: () =>
    set({ integration: undefined, activeObserver: undefined }),
  resetMediaState: () =>
    set({
      comments: [],
      mediaInfo: undefined,
      danmakuMeta: undefined,
    }),
}))
