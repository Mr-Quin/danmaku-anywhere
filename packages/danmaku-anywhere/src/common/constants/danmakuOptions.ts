import type { DanmakuOptions } from '@danmaku-anywhere/danmaku-engine'

import type { Options } from '../services/SyncOptionsService'

export type DanmakuOptionsOptions = Options<DanmakuOptions>

export const defaultDanmakuOptions: DanmakuOptions = {
  show: true,
  filters: [],
  filterLevel: 0,
  speed: 1,
  style: {
    opacity: 1,
    fontSize: 25,
    fontFamily: 'sans-serif',
  },
}
