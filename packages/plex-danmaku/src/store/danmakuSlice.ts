import {
  DanDanChConvert,
  DanDanComment,
  DanDanCommentAPIParams,
  fetchComments,
} from '@danmaku-anywhere/dandanplay-api'
import { DanmakuManager } from '@danmaku-anywhere/danmaku-engine'
import { StateCreator } from 'zustand'

import type { State } from './store'

import { debounce } from '@/utils/debounce'
import { logger } from '@/utils/logger'

interface DanmakuStyle {
  opacity: number
  fontSize: number
  fontFamily: string
}

interface DanmakuConfig {
  style: DanmakuStyle
  autoFetch: boolean
  enabled: boolean
  filters: string[]
  userFilters: string[]
  speed: number
  chConvert: DanDanChConvert
}

interface DanmakuData {
  config: DanmakuConfig
  engine: DanmakuManager | null
  container: HTMLElement | null
  media: HTMLMediaElement | null
  comments: DanDanComment[] | null
}

export interface DanmakuCache {
  comments: DanDanComment[]
  episodeId: number
  time: number
  params: Partial<DanDanCommentAPIParams>
}

export interface DanmakuSlice {
  danmaku: DanmakuData
  _fetchCommentsWithCache: (
    episodeId: number,
    params: Partial<DanDanCommentAPIParams>
  ) => Promise<DanDanComment[]>
  fetchComments: (
    episodeId: number,
    params: Partial<DanDanCommentAPIParams>,
    useCache?: boolean
  ) => Promise<DanDanComment[]>
  updateDanmakuConfig: (config: Partial<DanmakuConfig>) => void
  // recreate the danmaku engine to apply the styles as a side effect
  updateDanmakuStyle: (style: Partial<DanmakuStyle>) => void
  createDanmaku: (
    container: HTMLElement,
    media: HTMLMediaElement
  ) => DanmakuManager | null
  // updates danmaku config and also update the danmaku engine
  toggleDanmaku: () => void
  setDanmakuSpeed: (speed: number) => void
  // used when the media is changed, reset all danmaku related state, but not the config
  resetDanmaku: () => void
  // used when style is changed, destroys the old engine and creates a new one
  recreateDanmaku: () => void
  destroyDanmaku: () => void
}

const defaultDamakuConfig: DanmakuConfig = {
  chConvert: DanDanChConvert.None,
  autoFetch: false,
  enabled: true,
  filters: [],
  userFilters: [],
  speed: 1,
  style: {
    opacity: 1,
    fontSize: 25,
    fontFamily: 'sans-serif',
  },
}

const defaultDanmakuData: DanmakuData = {
  config: defaultDamakuConfig,
  engine: null,
  media: null,
  container: null,
  comments: null,
}

Object.freeze(defaultDamakuConfig)
Object.freeze(defaultDanmakuData)

const DANMAKU_CONFIG_KEY = 'danmaku-config'

const getDanmakuConfig = (): DanmakuConfig => {
  const config = localStorage.getItem(DANMAKU_CONFIG_KEY)

  if (config) {
    const parsed = JSON.parse(config) as Partial<DanmakuConfig>
    const newConfig = { ...defaultDamakuConfig }

    for (const key in newConfig) {
      if (Object.hasOwn(parsed, key)) {
        // @ts-ignore
        newConfig[key] = parsed[key]
      }
    }

    return newConfig
  }

  return { ...defaultDamakuConfig }
}

const persistConfig = debounce((config: DanmakuConfig) => {
  localStorage.setItem(DANMAKU_CONFIG_KEY, JSON.stringify(config))
}, 1000)

export const createDanmakuSlice: StateCreator<State, [], [], DanmakuSlice> = (
  set,
  get
) => ({
  danmaku: {
    ...defaultDanmakuData,
    config: getDanmakuConfig(),
  },
  _fetchCommentsWithCache: async (episodeId, params) => {
    const db = get().db

    const cache = await db?.get('danmaku', episodeId)

    // TODO: cache invalidation
    if (cache) {
      logger.debug('Danmaku cache hit, using cache', cache)

      set((state) => ({
        danmaku: {
          ...state.danmaku,
          comments: cache.comments,
        },
      }))

      return cache.comments as DanDanComment[]
    }

    logger.debug('Danmaku cache miss, falling back to api request')

    return get().fetchComments(episodeId, params, false)
  },
  fetchComments: async (episodeId, params, useCache = true) => {
    if (useCache) {
      return get()._fetchCommentsWithCache(episodeId, params)
    }

    // merge the config with the params
    const { chConvert } = get().danmaku.config

    params.chConvert ??= chConvert

    logger.debug('Dispatching damaku request', episodeId, params)

    const result = await fetchComments(episodeId, params)

    logger.debug('Danmaku result', result)

    set((state) => ({
      danmaku: {
        ...state.danmaku,
        comments: result.comments,
      },
    }))

    if (result.comments.length > 0) {
      // cache the comments
      await get().db?.put('danmaku', {
        comments: result.comments,
        time: Date.now(),
        params,
        episodeId,
      })
    }

    return result.comments
  },
  updateDanmakuConfig: (config) => {
    const existingConfig = get().danmaku.config
    const newConfig = { ...existingConfig, ...config }

    persistConfig(newConfig)

    set((state) => ({
      danmaku: {
        ...state.danmaku,
        config: newConfig,
      },
    }))
  },
  updateDanmakuStyle: (style) => {
    const { config: existingConfig } = get().danmaku
    const newConfig = {
      ...existingConfig,
      style: { ...existingConfig.style, ...style },
    }

    get().updateDanmakuConfig(newConfig)
    get().recreateDanmaku()
  },
  createDanmaku: (container, media) => {
    logger.debug('Creating danmaku engine')
    const { comments, config } = get().danmaku

    if (!comments) {
      throw new Error('Trying to create danmaku engine without comments')
    }

    get().destroyDanmaku()

    const danmakuEngine = new DanmakuManager()

    danmakuEngine.create(container, media, comments, {
      style: config.style,
      speed: config.speed,
    })

    if (!config.enabled) danmakuEngine.hide()

    set((state) => ({
      danmaku: {
        ...state.danmaku,
        engine: danmakuEngine,
        container,
        media,
      },
    }))

    return danmakuEngine
  },
  toggleDanmaku: () => {
    const { engine, config } = get().danmaku

    get().updateDanmakuConfig({
      enabled: !config.enabled,
    })

    if (config.enabled) {
      engine?.hide()
    } else {
      engine?.show()
    }
  },
  setDanmakuSpeed: (speed) => {
    const { engine } = get().danmaku

    get().updateDanmakuConfig({
      speed,
    })

    if (engine) {
      engine.updateConfig({
        speed,
      })
    }
  },
  resetDanmaku: () => {
    get().destroyDanmaku()

    set((state) => ({
      danmaku: {
        ...defaultDanmakuData,
        config: state.danmaku.config,
      },
    }))
  },
  recreateDanmaku: debounce(() => {
    const { container, media } = get().danmaku

    if (!container || !media) return

    get().createDanmaku(container, media)
  }, 200),
  destroyDanmaku: () => {
    const { engine } = get().danmaku

    engine?.destroy()

    set((state) => ({
      danmaku: {
        ...state.danmaku,
        engine: null,
      },
    }))
  },
})
