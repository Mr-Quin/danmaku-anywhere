import type { DanmakuOptions as DanmakuEngineOptions } from '@danmaku-anywhere/danmaku-engine'

import type { Options } from '@/common/options/OptionsService/types'

export type DanmakuOptions = Omit<DanmakuEngineOptions, 'show'>

export type DanmakuOptionsOptions = Options<DanmakuOptions>

export const defaultDanmakuOptions: DanmakuOptions = {
  filters: [],
  trackHeight: 32,
  allowOverlap: false,
  overlap: 0,
  speed: 1,
  style: {
    opacity: 0.7,
    fontSize: 25,
    fontFamily: 'sans-serif',
    customCss: '',
  },
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
}
