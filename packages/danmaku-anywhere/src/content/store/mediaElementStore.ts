import { create } from 'zustand'

import { createSelectors } from '@/common/utils/createSelectors'

interface MediaElementStoreState {
  videoNode: HTMLVideoElement | null
  containerNode: HTMLElement | null
  fullScreenElement: Element | null
  videoSrc: string | null
  setVideoNode: (videoNode: HTMLVideoElement | null) => void
  setContainerNode: (container: HTMLElement | null) => void
  setFullScreenElement: (fullScreenElement: Element | null) => void
  setVideoSrc: (src: string | null) => void
}

const useMediaElementStoreBase = create<MediaElementStoreState>((set) => ({
  videoNode: null,
  containerNode: null,
  fullScreenElement: null,
  videoSrc: null,
  setVideoNode: (videoNode) => set({ videoNode }),
  setContainerNode: (containerNode) => set({ containerNode }),
  setFullScreenElement: (fullScreenElement) => set({ fullScreenElement }),
  setVideoSrc: (videoSrc) => set({ videoSrc }),
}))

export const useMediaElementStore = createSelectors(useMediaElementStoreBase)
