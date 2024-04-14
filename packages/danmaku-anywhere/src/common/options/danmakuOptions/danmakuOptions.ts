import type { DanmakuOptions as DanmakuEngineOptions } from '@danmaku-anywhere/danmaku-engine'

import type { Options } from '../../services/SyncOptionsService'

export interface SafeZones {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export type DanmakuOptions = DanmakuEngineOptions & {
  /**
   * Area in percentage of the video that will not be covered by the danmaku.
   * top/bottom are relative to the video height, left/right are relative to the video width.
   */
  readonly safeZones: SafeZones
}

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
  safeZones: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  offset: 0,
}
