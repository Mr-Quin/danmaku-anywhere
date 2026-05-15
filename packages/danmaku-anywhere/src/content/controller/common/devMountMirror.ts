import type { useStore } from '@/content/controller/store/store'

/**
 * Snapshot of mount state read by the SW dev API via
 * `chrome.scripting.executeScript({ world: 'ISOLATED' })`. The SW shares
 * this extension's isolated world with the controller content script, so a
 * global on `globalThis` is the simplest read channel.
 *
 * `episodeIds` and `seasonIds` align by index, so the spec can check
 * "the seeded season is mounted" without doing an extra DB round-trip.
 */
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
    // GenericEpisode is WithSeason<Episode> | CustomEpisode. CustomEpisodes
    // have no `season` field — surface 0 there so consumers see the index
    // alignment break rather than a silent skew.
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
