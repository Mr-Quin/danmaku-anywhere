import type {
  DanmakuOptions as DanmakuEngineOptions,
  DanmakuFilter,
} from '@danmaku-anywhere/danmaku-engine'

import type { Options } from '@/common/options/OptionsService/types'

export interface DedupOptions {
  readonly enabled: boolean
  /** Seconds tolerance for considering comments duplicates within a rolling +/- time window. */
  readonly tolerance: number
  /** Comments whose text matches any enabled entry are exempted from dedup. */
  readonly whitelist: DanmakuFilter[]
}

export type DanmakuOptions = Omit<DanmakuEngineOptions, 'show' | 'dedup'> & {
  readonly customCss: string
  readonly useCustomCss: boolean
  readonly dedup: DedupOptions
}

export type DanmakuOptionsOptions = Options<DanmakuOptions>

export const defaultDanmakuOptions: DanmakuOptions = {
  filters: [],
  trackHeight: 32,
  allowOverlap: false,
  overlap: 100,
  speed: 1,
  style: {
    opacity: 0.7,
    fontSize: 25,
    fontFamily: 'sans-serif',
  },
  useCustomCss: false,
  customCss: '',
  maxOnScreen: 500,
  interval: 200,
  trackLimit: 32,
  area: {
    yStart: 0,
    yEnd: 80,
    xStart: 0,
    xEnd: 100,
  },
  specialComments: {
    top: 'normal',
    bottom: 'scroll',
  },
  offset: 0,
  distribution: 'random',
  dedup: {
    enabled: true,
    tolerance: 0.5,
    whitelist: [
      { type: 'regex', value: '^[?？!！。.,，~～\\s]+$', enabled: true },
      { type: 'regex', value: '^(哈|h){2,}$', enabled: true },
      { type: 'regex', value: '^w{2,}$', enabled: true },
      { type: 'regex', value: '^(6|六){2,}$', enabled: true },
      { type: 'regex', value: '^(草|艹)+$', enabled: true },
      { type: 'regex', value: '^(笑|lol|LOL)$', enabled: true },
    ],
  },
}
