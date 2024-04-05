import { create } from 'zustand'

interface MediaElementStoreState {
  videoNode: HTMLVideoElement | null
  containerNode: HTMLElement | null
  setVideoNode: (videoNode: HTMLVideoElement | null) => void
  setContainerNode: (container: HTMLElement | null) => void
}

export const useMediaElementStore = create<MediaElementStoreState>((set) => ({
  videoNode: null,
  containerNode: null,
  setVideoNode: (videoNode) => set({ videoNode }),
  setContainerNode: (containerNode) => set({ containerNode }),
}))
