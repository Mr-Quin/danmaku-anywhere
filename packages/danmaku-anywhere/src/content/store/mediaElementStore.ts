import { DanmakuManager } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

import { createSelectors } from '@/common/utils/createSelectors'

interface MediaElementStoreState {
  danmakuEngine: DanmakuManager
  hasVideo: boolean
  videoNode: HTMLVideoElement | null
  containerNode: HTMLElement | null
  setVideoNode: (videoNode: HTMLVideoElement | null) => void
  setContainerNode: (container: HTMLElement | null) => void
  seek: (time: number) => void
}

const useMediaElementStoreBase = create<MediaElementStoreState>((set, get) => ({
  danmakuEngine: new DanmakuManager(),
  hasVideo: false,
  videoNode: null,
  containerNode: null,
  setVideoNode: (videoNode) => set({ videoNode }),
  setContainerNode: (containerNode) => set({ containerNode }),
  seek: (time) => {
    const videoNode = get().videoNode
    if (videoNode) {
      videoNode.currentTime = time
    }
  },
}))

export const useMediaElementStore = createSelectors(useMediaElementStoreBase)
