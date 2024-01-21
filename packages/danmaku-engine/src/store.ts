import DanmakuEngine from 'danmaku'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'

import { DanDanComment } from './api'
import {
  createDanmakuEngine,
  DanmakuStyle,
  sampleComments,
  transformDanDanComments,
} from './parser'

export interface DanmakuOptions {
  style: DanmakuStyle
  show: boolean
  filters: string[]
  filterLevel: number
  speed: number
}

interface Engine {
  instance: DanmakuEngine | null
  container: HTMLElement | null
  media: HTMLMediaElement | null
  comments: DanDanComment[] | null
}

const engineDefaults: Engine = {
  instance: null,
  media: null,
  container: null,
  comments: null,
}

interface State {
  create: (
    container: HTMLElement,
    media: HTMLMediaElement,
    comments: DanDanComment[],
    config?: DanmakuOptions
  ) => Engine
  recreate: (
    comments?: DanDanComment[],
    config?: DanmakuOptions
  ) => Engine | null
  destroy: () => void
  updateConfig: (config: DanmakuOptions) => void
  config: DanmakuOptions
  engine: Engine
  created: boolean
}

const configDefaults: DanmakuOptions = {
  show: true,
  filters: [],
  speed: 1, // speed is a multiplier of the base speed of 144
  filterLevel: 0,
  style: {
    opacity: 1,
    fontSize: 25,
    fontFamily: 'sans-serif',
  },
}

const baseSpeed = 144

// level is from 0 to 5
const filterLevelToRatio = (level: number) => {
  return (5 - level) / 5
}

export const store = create<State>((set, get) => ({
  engine: engineDefaults,
  config: configDefaults,
  created: false,
  create: (container, media, comments, config?) => {
    config ??= get().config

    const sampledComments = sampleComments(
      comments,
      filterLevelToRatio(config.filterLevel)
    )

    const parsedComments = transformDanDanComments(
      sampledComments,
      config.style
    )

    const engineInstance = createDanmakuEngine({
      container,
      media,
      comments: parsedComments,
      speed: config.speed * baseSpeed,
    })

    const engine = {
      ...get().engine,
      container,
      media,
      comments,
      instance: engineInstance,
    }

    set({ engine, created: true })
    return engine
  },
  recreate: (comments?, config?) => {
    const { container, media, comments: prevComments } = get().engine
    if (!container || !media) {
      return null
    }

    if (!comments && !prevComments) {
      return null
    }

    return get().create(container, media, comments ?? prevComments!, config)
  },
  destroy: () => {
    const { instance } = get().engine
    instance?.destroy()

    set({ engine: engineDefaults, created: false })
  },
  updateConfig: (config) => {
    const { instance } = get().engine
    if (!instance) {
      return
    }

    get().recreate(undefined, config)

    set({ config: { ...get().config, ...config } })
  },
}))

export const useDanmakuStore = store

export interface UseDanmakuConfig {
  container?: HTMLElement
  media?: HTMLMediaElement
  comments?: DanDanComment[]
  config?: DanmakuOptions
}

export const useDanmakuEngine = ({
  container,
  media,
  comments,
  config: configProp,
}: UseDanmakuConfig = {}) => {
  const store = useDanmakuStore()
  const isInit = useRef(true)

  const { create, destroy, updateConfig, created } = store

  useEffect(() => {
    if (isInit.current) return
    if (configProp && created) {
      updateConfig(configProp)
    }
  }, [configProp])

  useEffect(() => {
    if (!container || !media || !comments) return

    create(container, media, comments, configProp)

    isInit.current = false

    return () => {
      destroy()
    }
  }, [container, media, comments])

  return store
}
