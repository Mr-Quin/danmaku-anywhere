import { DanDanComment } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

import {
  MediaObserver,
  MediaInfo,
  PlaybackStatus,
} from '../integration/MediaObserver'

import { DanmakuMeta } from '@/common/db'

interface StoreState {
  comments: DanDanComment[]
  setComments: (comments: DanDanComment[]) => void
  mediaInfo?: MediaInfo
  setMediaInfo: (mediaInfo: MediaInfo) => void
  status: PlaybackStatus
  setStatus: (status: PlaybackStatus) => void
  danmakuMeta?: DanmakuMeta
  setDanmakuMeta: (danmakuMeta: DanmakuMeta) => void
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
      status: 'stopped',
      danmakuMeta: undefined,
      // don't reset observer and integration
    }),
}))
