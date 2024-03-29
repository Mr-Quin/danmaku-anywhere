import type { DanDanComment } from '@danmaku-anywhere/dandanplay-api'
import { create } from 'zustand'

import type {
  MediaObserver,
  MediaInfo,
  PlaybackStatus,
} from '../integration/MediaObserver'

import type { DanmakuMeta } from '@/common/db/db'

interface StoreState {
  comments: DanDanComment[]
  setComments: (comments: DanDanComment[]) => void
  mediaInfo?: MediaInfo
  setMediaInfo: (mediaInfo: MediaInfo) => void
  status: PlaybackStatus
  setStatus: (status: PlaybackStatus) => void
  danmakuMeta?: DanmakuMeta
  setDanmakuMeta: (danmakuMeta: DanmakuMeta | undefined) => void
  activeObserver?: MediaObserver
  integration?: string
  setActiveObserver: (name: string, observer: MediaObserver) => void
  resetMediaState: () => void
}

export const useStore = create<StoreState>((set) => ({
  comments: [],
  setComments: (comments) => set({ comments }),
  mediaInfo: undefined,
  setMediaInfo: (mediaInfo) => set({ mediaInfo }),
  status: 'stopped',
  setStatus: (status) => set({ status }),
  danmakuMeta: undefined,
  setDanmakuMeta: (danmakuMeta) => set({ danmakuMeta }),
  activeObserver: undefined,
  integration: undefined,
  setActiveObserver: (name, observer) =>
    set({ integration: name, activeObserver: observer }),
  resetMediaState: () =>
    set({
      comments: [],
      mediaInfo: undefined,
      danmakuMeta: undefined,
    }),
}))
