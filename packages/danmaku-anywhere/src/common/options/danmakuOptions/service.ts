import { produce } from 'immer'
import { inject, injectable } from 'inversify'
import {
  type DanmakuOptions,
  defaultDanmakuOptions,
} from '@/common/options/danmakuOptions/constant'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import type { PrevOptions } from '../OptionsService/types'

@injectable('Singleton')
export class DanmakuOptionsService implements IStoreService {
  public readonly options: OptionsService<DanmakuOptions>

  constructor(
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory(
      'danmakuOptions',
      defaultDanmakuOptions
    )
      .version(1, {
        upgrade: (data) => data,
      })
      .version(2, {
        upgrade: (data) => ({
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
        upgrade: (data) => {
          return produce<PrevOptions>(data, (draft) => {
            // remove fields: show, filterLevel
            // add limitPerSec
            delete draft.show
            delete draft.filterLevel
            draft.limitPerSec = 10
          })
        },
      })
      .version(4, {
        upgrade: (data) => {
          return produce<PrevOptions>(data, (draft) => {
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
        upgrade: (data) => {
          return produce<PrevOptions>(data, (draft) => {
            draft.distribution = 'random'
          })
        },
      })
  }

  async get() {
    return this.options.get()
  }

  async set(data: DanmakuOptions, version?: number) {
    return this.options.set(data, version)
  }

  async update(data: Partial<DanmakuOptions>) {
    return this.options.update(data)
  }

  onChange(listener: (data: DanmakuOptions) => void) {
    return this.options.onChange(listener)
  }
}
