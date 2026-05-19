import type {
  CollapseConfig,
  DanmakuOptions as DanmakuEngineOptions,
} from '@danmaku-anywhere/danmaku-engine'

import type { Options } from '@/common/options/OptionsService/types'

export type DanmakuOptions = Omit<DanmakuEngineOptions, 'show'> & {
  readonly customCss: string
  readonly useCustomCss: boolean
}

export type DanmakuOptionsOptions = Options<DanmakuOptions>

export const defaultCollapseConfig: CollapseConfig = {
  dedupe: { enabled: true, windowMs: 100, maxDedupe: 2 },
  pattern: {
    enabled: true,
    autoCollapse: true,
    minCount: 5,
    liveCount: true,
    pulse: true,
    patterns: [
      { label: '草', type: 'regex', value: '^(草|艹)+$', enabled: true },
      { label: '哈哈哈', type: 'regex', value: '^(哈|h){2,}$', enabled: true },
      { label: '逆天', type: 'text', value: '逆天', enabled: true },
      { label: '?', type: 'regex', value: '^[?？!！.,]+$', enabled: true },
    ],
  },
  whiteList: [],
}

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
  collapse: defaultCollapseConfig,
}
