import type {
  CommentEntity,
  GenericEpisode,
} from '@danmaku-anywhere/danmaku-converter'
import { enableMapSet } from 'immer'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { createSelectors } from '@/common/utils/createSelectors'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'

enableMapSet()

interface FrameState {
  frameId: number
  documentId: string
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
   * Is the page disconnected from the background?
   */
  isDisconnected: boolean
  setIsDisconnected: (disconnected: boolean) => void

  danmaku: {
    isMounted: boolean
    /**
     * For filtering the episode list in the mount controller
     */
    filter: string
    setFilter: (filter: string) => void

    mount: (episodes: GenericEpisode[]) => void
    unmount: () => void

    /**
     * Whether danmaku should be visible
     */
    isVisible: boolean
    toggleVisible: (visible?: boolean) => void

    /**
     * Danmaku to be displayed
     */
    comments: CommentEntity[]

    /**
     * Information about the current danmaku
     */
    episodes?: GenericEpisode[]
    setEpisodes: (episodes: GenericEpisode[] | undefined) => void

    /**
     * Whether the danmaku is manually set
     * When true, integration will not be used
     */
    isManual: boolean
    toggleManualMode: (manual?: boolean) => void
  }

  seekToTime: (time: number) => void

  /**
   * Media information for pages with integration
   */
  integration: {
    active: boolean
    activate: () => void
    deactivate: () => void
    foundElements: boolean
    setFoundElements: (foundElements: boolean) => void
    errorMessage?: string
    setErrorMessage: (errMessage?: string) => void
    mediaInfo?: MediaInfo
    setMediaInfo: (mediaInfo: MediaInfo) => void
  }

  /**
   * Whether the video element is present
   */
  hasVideo: () => boolean
  videoId?: string
  setVideoId: (videoId?: string) => void

  /**
   * State of each frame in the page
   */
  frame: {
    allFrames: Map<number, FrameState>
    activeFrame?: FrameState
    mustGetActiveFrame: () => FrameState
    setActiveFrame: (frameId: number) => void
    addFrame: (init: Pick<FrameState, 'frameId' | 'url' | 'documentId'>) => void
    removeFrame: (frameId: number) => void
    updateFrame: (
      frameId: number,
      nextState: Partial<FrameState> | ((prev: FrameState) => FrameState)
    ) => void
  }

  /**
   * Form state
   */
  integrationForm: {
    showEditor: boolean
    toggleEditor: (show?: boolean) => void
  }
}

const useStoreBase = create<StoreState>()(
  immer((set, get) => ({
    isDisconnected: false,
    setIsDisconnected: (disconnected) => {
      set((state) => {
        state.isDisconnected = disconnected
      })
    },

    danmaku: {
      isMounted: false,

      filter: '',
      setFilter: (filter) => {
        set((state) => {
          state.danmaku.filter = filter
        })
      },

      mount: (episodes) => {
        set((state) => {
          state.danmaku.isMounted = true
          state.danmaku.episodes = episodes
          state.danmaku.comments = episodes.flatMap((episode) => {
            return episode.comments
          })
        })
      },
      unmount: () => {
        set((state) => {
          state.danmaku.isMounted = false
          state.danmaku.episodes = undefined
          state.danmaku.comments = []
        })
      },
      isVisible: true,
      toggleVisible: (visible) => {
        if (visible === undefined) {
          set((state) => {
            state.danmaku.isVisible = !state.danmaku.isVisible
          })
        } else {
          set((state) => {
            state.danmaku.isVisible = visible
          })
        }
      },

      comments: [],
      episodes: undefined,
      setEpisodes: (episodes) => {
        set((state) => {
          state.danmaku.episodes = episodes
        })
      },

      isManual: false,
      toggleManualMode: (manual) => {
        if (manual !== undefined) {
          set((state) => {
            state.danmaku.isManual = manual
          })
        } else {
          set((state) => {
            state.danmaku.isManual = !state.danmaku.isManual
          })
        }
      },
    },

    seekToTime: (time) => {
      void playerRpcClient.player['relay:command:seek']({
        frameId: get().frame.mustGetActiveFrame().frameId,
        data: time,
      })
    },

    integration: {
      active: false,
      activate: () =>
        set((state) => {
          state.integration.active = true
        }),
      deactivate: () => {
        set((state) => {
          state.integration.active = false
          state.integration.mediaInfo = undefined
          state.integration.foundElements = false
          state.integration.errorMessage = undefined
        })
      },
      foundElements: false,
      setFoundElements: (foundElements) =>
        set((state) => {
          state.integration.foundElements = foundElements
        }),
      errorMessage: undefined,
      setErrorMessage: (errMessage) => {
        set((state) => {
          state.integration.errorMessage = errMessage
        })
      },
      mediaInfo: undefined,
      setMediaInfo: (mediaInfo) =>
        set((state) => {
          state.integration.mediaInfo = mediaInfo
        }),
    },

    hasVideo: () => {
      return get().videoId !== undefined
    },
    videoId: undefined,
    setVideoId: (videoId) => {
      set((state) => {
        state.videoId = videoId
      })
    },

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
        const selectedFrame = get().frame.allFrames.get(frameId)

        if (!selectedFrame) {
          throw new Error(
            `Error setting active frame: Frame ${frameId} not found`
          )
        }

        set((state) => {
          state.frame.activeFrame = selectedFrame
        })
      },
      addFrame: ({ frameId, url, documentId }) => {
        set((state) => {
          state.frame.allFrames.set(frameId, {
            frameId,
            url,
            documentId,
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
          get().setVideoId(undefined)
          get().danmaku.unmount()
        }

        set((state) => {
          state.frame.allFrames.delete(frameId)

          if (frameId === state.frame.activeFrame?.frameId) {
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

          const nextFrame =
            typeof nextState === 'function'
              ? nextState(frame)
              : { ...frame, ...nextState }

          prev.frame.allFrames.set(frameId, nextFrame)

          if (frameId === prev.frame.activeFrame?.frameId) {
            prev.frame.activeFrame = nextFrame
          }
        })
      },
    },
    integrationForm: {
      showEditor: false,
      toggleEditor: (show) => {
        if (show !== undefined) {
          set((state) => {
            state.integrationForm.showEditor = show
          })
        } else {
          set((state) => {
            state.integrationForm.showEditor = !state.integrationForm.showEditor
          })
        }
      },
    },
  }))
)

export const useStore = createSelectors(useStoreBase)
