import { DanDanComment } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'
import {
  MediaObserver,
  MediaState,
  PlaybackStatus,
} from '../integration/MediaObserver'
import { PlexObserver } from '../integration/Plex'

interface StoreState {
  observers: (typeof MediaObserver)[]
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
  observers: [PlexObserver],
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
