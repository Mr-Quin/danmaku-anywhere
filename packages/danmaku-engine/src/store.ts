import DanmakuEngine from 'danmaku'
import { create } from 'zustand'
import { DanDanComment } from './api'
import {
  createDanmakuEngine,
  DanmakuStyle,
  transformDanDanComments,
} from './parser'

export interface DanmakuConfig {
  style: DanmakuStyle
  show: boolean
  filters: string[]
  userFilters: string[]
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
    config?: DanmakuConfig
  ) => Engine
  recreate: (
    comments?: DanDanComment[],
    config?: DanmakuConfig
  ) => Engine | null
  destroy: () => void
  updateConfig: (config: Partial<DanmakuConfig>) => void
  config: DanmakuConfig
  engine: Engine
}

const configDefaults: DanmakuConfig = {
  show: true,
  filters: [],
  userFilters: [],
  speed: 1,
  style: {
    opacity: 1,
    fontSize: 25,
    fontFamily: 'sans-serif',
  },
}

export const store = create<State>((set, get) => ({
  engine: engineDefaults,
  config: configDefaults,
  create: (container, media, comments, config?) => {
    config ??= get().config

    const parsedComments = transformDanDanComments(comments, config.style)

    const engineInstance = createDanmakuEngine({
      container,
      media,
      comments: parsedComments,
    })

    const engine = {
      ...get().engine,
      container,
      media,
      comments,
      instance: engineInstance,
    }

    set({ engine })
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

    set({ engine: engineDefaults })
  },
  updateConfig: (config) => {
    const { instance } = get().engine
    if (!instance) {
      return
    }

    const { style, ...rest } = config
    if (style) {
      // instance.setStyle(style)
    }

    set({ config: { ...get().config, ...rest } })
  },
}))
