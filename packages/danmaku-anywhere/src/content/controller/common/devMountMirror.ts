import type { useStore } from '@/content/controller/store/store'

// Read from the SW dev API via chrome.scripting.executeScript on the
// controller's isolated world. episodeIds and seasonIds align by index.
export interface MountMirror {
  isMounted: boolean
  episodeIds: number[]
  seasonIds: number[]
  activeFrameId?: number
  url: string
}

export const MOUNT_MIRROR_GLOBAL = '__daMountMirror' as const

declare global {
  var __daMountMirror: MountMirror | undefined
}

function snapshot(state: ReturnType<typeof useStore.getState>): MountMirror {
  const episodes = state.danmaku.episodes ?? []
  return {
    isMounted: state.danmaku.isMounted,
    episodeIds: episodes.map((e) => e.id),
    // CustomEpisode has no `season`; 0 keeps index alignment with episodeIds.
    seasonIds: episodes.map((e) => ('season' in e ? e.season.id : 0)),
    activeFrameId: state.frame.activeFrame?.frameId,
    url: window.location.href,
  }
}

export function attachMountMirror(store: typeof useStore): () => void {
  globalThis.__daMountMirror = snapshot(store.getState())
  const unsubscribe = store.subscribe((state) => {
    globalThis.__daMountMirror = snapshot(state)
  })
  return () => {
    unsubscribe()
    globalThis.__daMountMirror = undefined
  }
}
