import { DanDanComment } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'
import {
  MediaObserver,
  MediaState,
  PlaybackStatus,
} from '../integration/MediaObserver'

interface StoreState {
  comments: DanDanComment[]
  setComments: (comments: DanDanComment[]) => void
  mediaInfo?: MediaState
  setMediaInfo: (mediaInfo: MediaState) => void
  status?: PlaybackStatus
  setStatus: (status: PlaybackStatus) => void
  activeObserver?: MediaObserver
  integration?: string
  setActiveObserver: (name: string, observer: MediaObserver) => void
}

export const useStore = create<StoreState>((set) => ({
  comments: [],
  setComments: (comments) => set({ comments }),
  mediaInfo: undefined,
  setMediaInfo: (mediaInfo) => set({ mediaInfo }),
  status: undefined,
  setStatus: (status) => set({ status }),
  activeObserver: undefined,
  integration: undefined,
  setActiveObserver: (name, observer) =>
    set({ integration: name, activeObserver: observer }),
}))
