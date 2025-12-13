import { produce } from 'immer'
import { defaultDanmakuOptions } from '@/common/options/danmakuOptions/constant'
import type { PrevOptions } from '@/common/options/OptionsService/OptionsService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'

export const danmakuOptionsService = new OptionsService(
  'danmakuOptions',
  defaultDanmakuOptions
)
  .version(1, {
    upgrade: (data: PrevOptions) => data,
  })
  .version(2, {
    upgrade: (data: PrevOptions) => ({
      ...data,
      // add safeZones and offset
      safeZones: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      offset: 0,
    }),
  })
  .version(3, {
    upgrade: (data: PrevOptions) => {
      return produce<any>(data, (draft) => {
        // remove fields: show, filterLevel
        // add limitPerSec
        delete draft.show
        delete draft.filterLevel
        draft.limitPerSec = 10
      })
    },
  })
  .version(4, {
    upgrade: (data: PrevOptions) => {
      return produce<any>(data, (draft) => {
        draft.maxOnScreen = 500
        draft.trackLimit = 32
        draft.trackHeight = 32
        draft.allowOverlap = false
        draft.area = {
          yStart: 0,
          yEnd: 100,
          xStart: 0,
          xEnd: 100,
        }
        draft.specialComments = {
          top: 'normal',
          bottom: 'scroll',
        }
      })
    },
  })
  .version(5, {
    upgrade: (data: PrevOptions) => {
      return produce<any>(data, (draft) => {
        draft.distribution = 'random'
      })
    },
  })

export const danmakuOptionsServiceSymbol = Symbol.for('DanmakuOptionsService')
export type DanmakuOptionsService = typeof danmakuOptionsService
