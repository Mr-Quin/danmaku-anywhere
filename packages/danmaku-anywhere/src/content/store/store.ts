import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { create } from 'zustand'

import type { Danmaku, DanmakuLite } from '@/common/danmaku/models/danmaku'
import { danmakuToString } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import { createSelectors } from '@/common/utils/createSelectors'
import type { MediaInfo } from '@/content/danmaku/integration/models/MediaInfo'
import { createPipWindow } from '@/content/pip/pipUtils'
import { useDanmakuManager } from '@/content/store/danmakuManager'

interface PipState {
  // Pip window
  window: Window
  // Node in the pip window to use as the portal
  portal: HTMLElement
}

interface StoreState {
  /**
   * Whether to enable the danmaku feature
   * If off, the popup will work, but danmaku will not be displayed
   * This is separate from the extension options
   */
  enabled: boolean
  toggleEnabled: (enabled?: boolean) => void

  /**
   * Danmaku to be displayed
   */
  comments: CommentEntity[]
  hasComments: boolean
  setComments: (comments: CommentEntity[]) => void
  unsetComments: () => void

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
  mountManual: (danmaku: Danmaku) => void
  unmountManual: () => void

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
   * Picture-in-picture related state
   */
  pip?: PipState
  enterPip: () => Promise<PipState>
  exitPip: () => void
}

const useStoreBase = create<StoreState>((set, get) => ({
  enabled: true,
  toggleEnabled: (enabled) => {
    if (enabled !== undefined) {
      set({ enabled })
    }
    set({ enabled: !get().enabled })
  },

  comments: [],
  hasComments: false,
  setComments: (comments) => set({ comments, hasComments: true }),
  unsetComments: () => {
    useDanmakuManager.getState().manager.unmount()
    set({ comments: [], hasComments: false })
  },

  manual: false,
  toggleManualMode: (manual) => {
    if (manual === undefined) {
      set((state) => ({ manual: !state.manual }))
    } else {
      set({ manual })
    }
  },
  mountManual: (danmaku) => {
    useDanmakuManager.getState().manager.mount(danmaku.comments)
    get().resetMediaState()
    get().toggleManualMode(true)
    get().setComments(danmaku.comments)
    get().setDanmakuLite(danmaku)
  },
  unmountManual: () => {
    useDanmakuManager.getState().manager.unmount()
    get().resetMediaState()
    get().toggleManualMode(false)
    get().unsetComments()
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

  pip: undefined,
  enterPip: async () => {
    Logger.debug('Entering pip')
    const pipWindow = await createPipWindow()
    const portal = pipWindow.document.createElement('div')
    portal.style.setProperty('position', 'absolute', 'important')
    portal.style.setProperty('z-index', '2147483647', 'important')
    portal.style.setProperty('left', '0', 'important')
    portal.style.setProperty('top', '0', 'important')

    pipWindow.document.body.appendChild(portal)

    set({ pip: { window: pipWindow, portal } })

    return { window: pipWindow, portal }
  },
  exitPip: () => {
    set({ pip: undefined })
  },
}))

export const useStore = createSelectors(useStoreBase)
