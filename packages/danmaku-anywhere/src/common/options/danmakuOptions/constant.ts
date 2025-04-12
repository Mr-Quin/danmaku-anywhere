import type { DanmakuOptions as DanmakuEngineOptions } from '@danmaku-anywhere/danmaku-engine'

import type { Options } from '@/common/options/OptionsService/types'

export type DanmakuOptions = Omit<DanmakuEngineOptions, 'show'>

export type DanmakuOptionsOptions = Options<DanmakuOptions>

export const defaultDanmakuOptions: DanmakuOptions = {
  filters: [],
  trackHeight: 38,
  allowOverlap: false,
  speed: 1,
  style: {
    opacity: 1,
    fontSize: 25,
    fontFamily: 'sans-serif',
  },
  maxOnScreen: 500,
  trackLimit: 32,
  area: {
    yStart: 0,
    yEnd: 100,
    xStart: 0,
    xEnd: 100,
  },
  specialComments: {
    top: 'normal',
    bottom: 'scroll',
  },
  offset: 0,
}
