import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { enableMapSet } from 'immer'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { danmakuToString } from '@/common/danmaku/utils'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { createSelectors } from '@/common/utils/createSelectors'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'

enableMapSet()

interface FrameState {
  frameId: number
  // The url of the frame
  url: string
  // Whether the danmaku manager has started in this frame
  started: boolean
  // Whether danmaku is mounted in this frame
  mounted: boolean
  // Whether a video element is detected in this frame
  hasVideo: boolean
}

interface StoreState {
  /**
   * Whether danmaku is visible
   */
  visible: boolean
  toggleVisible: (visible?: boolean) => void

  /**
   * Danmaku to be displayed
   */
  comments: CommentEntity[]
  hasComments: boolean
  setComments: (comments: CommentEntity[]) => void
  unsetComments: () => void
  seekToTime: (time: number) => void

  /**
   * Information about the current danmaku
   */
  danmakuLite?: DanmakuLite
  setDanmakuLite: (danmakuMeta: DanmakuLite | undefined) => void

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
  toggleManualMode: (manual?: boolean) => void
  mountManual: () => void

  /**
   * Reset media related state
   * Includes comments, mediaInfo, and danmakuMeta
   */
  resetMediaState: (mediaInfo?: MediaInfo) => void

  /**
   * Uses the mediaInfo and danmakuMeta to get the name
   */
  getAnimeName: () => string

  /**
   * Whether the video element is present
   */
  hasVideo: boolean
  setHasVideo: (hasVideo: boolean) => void

  /**
   * State of each frame in the page
   */
  frame: {
    allFrames: Map<number, FrameState>
    activeFrame?: number // the frameId that has the video we care about
    mustGetActiveFrame: () => number
    setActiveFrame: (frameId: number) => void
    addFrame: (init: Pick<FrameState, 'frameId' | 'url'>) => void
    removeFrame: (frameId: number) => void
    updateFrame: (
      frameId: number,
      nextState: Partial<FrameState> | ((prev: FrameState) => FrameState)
    ) => void
  }
}

const useStoreBase = create<StoreState>()(
  immer((set, get) => ({
    visible: true,
    toggleVisible: (visible) => {
      if (visible !== undefined) {
        set({ visible })
      }
      set({ visible: !get().visible })
    },

    comments: [],
    hasComments: false,
    setComments: async (comments) => {
      set({ comments, hasComments: true })
    },
    unsetComments: async () => {
      set({ comments: [], hasComments: false })
    },
    seekToTime: (time) => {
      void playerRpcClient.player.seek({
        frameId: get().frame.mustGetActiveFrame(),
        data: time,
      })
    },

    manual: false,
    toggleManualMode: (manual) => {
      if (manual === undefined) {
        set((state) => ({ manual: !state.manual }))
      } else {
        set({ manual })
      }
    },
    mountManual: () => {
      get().resetMediaState()
      get().toggleManualMode(true)
    },

    mediaInfo: undefined,
    setMediaInfo: (mediaInfo) => set({ mediaInfo }),

    danmakuLite: undefined,
    setDanmakuLite: (danmakuLite) => set({ danmakuLite }),

    resetMediaState: (mediaInfo) => {
      get().unsetComments()
      get().setDanmakuLite(undefined)
      set({
        mediaInfo: mediaInfo,
      })
    },

    getAnimeName: () => {
      const { mediaInfo, danmakuLite } = get()
      if (mediaInfo) return mediaInfo.toString()
      if (danmakuLite) {
        return danmakuToString(danmakuLite)
      }
      return 'Unknown anime'
    },

    hasVideo: false,
    setHasVideo: (hasVideo) => set({ hasVideo }),

    frame: {
      allFrames: new Map<number, FrameState>(),
      activeFrame: undefined,
      mustGetActiveFrame: () => {
        const activeFrame = get().frame.activeFrame
        if (activeFrame === undefined) {
          throw new Error('No active frame')
        }
        return activeFrame
      },
      setActiveFrame: (frameId) => {
        set((state) => {
          state.frame.activeFrame = frameId
        })
      },
      addFrame: ({ frameId, url }) => {
        set((state) => {
          state.frame.allFrames.set(frameId, {
            frameId,
            url,
            started: false,
            mounted: false,
            hasVideo: false,
          })
        })
      },
      removeFrame: (frameId) => {
        const frame = get().frame.allFrames.get(frameId)

        if (!frame) {
          throw new Error(
            `Failed to remove frame ${frameId}: frame not found in store`
          )
        }

        if (frame.mounted) {
          get().setHasVideo(false)
          get().resetMediaState()
        }

        set((state) => {
          state.frame.allFrames.delete(frameId)

          if (frameId === state.frame.activeFrame) {
            state.frame.activeFrame = undefined
          }
        })
      },
      updateFrame: (frameId, nextState) => {
        set((prev) => {
          const frame = prev.frame.allFrames.get(frameId)
          if (!frame) {
            throw new Error(`Updating frame ${frameId} failed. Frame not found`)
          }
          if (typeof nextState === 'function') {
            prev.frame.allFrames.set(frameId, nextState(frame))
          } else {
            prev.frame.allFrames.set(frameId, { ...frame, ...nextState })
          }
        })
      },
    },
  }))
)

export const useStore = createSelectors(useStoreBase)
