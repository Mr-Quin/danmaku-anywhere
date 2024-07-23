import { DanDanChConvert } from '@danmaku-anywhere/dandanplay-api'
import { produce } from 'immer'

import { Language } from '@/common/localization/language'
import { defaultDanmakuOptions } from '@/common/options/danmakuOptions/danmakuOptions'
import type { ExtensionOptions } from '@/common/options/extensionOptions/extensionOptions'
import { defaultExtensionOptions } from '@/common/options/extensionOptions/extensionOptions'
import { defaultMountConfig } from '@/common/options/mountConfig/mountConfig'
import { SyncOptionsService } from '@/common/services/SyncOptionsService/SyncOptionsService'

type PrevOptions = any

export const extensionOptionsService = new SyncOptionsService(
  'extensionOptions',
  defaultExtensionOptions
)
  .version(1, {
    upgrade: (data: PrevOptions) => data,
  })
  .version(2, {
    upgrade: (data: PrevOptions) => {
      return {
        ...data,
        lang: Language.zh, // add lang field
      }
    },
  })
  .version(3, {
    upgrade: (data: PrevOptions) => {
      return {
        ...data,
        danmakuSources: {
          dandanplay: {
            baseUrl: 'https://api.dandanplay.net', // add danmakuSource with baseUrl field
          },
        },
      }
    },
  })
  .version(4, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        draft.danmakuSources.dandanplay.chConvert = DanDanChConvert.None
      }),
  })

const danmakuOptionsService = new SyncOptionsService(
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

export const mountConfigService = new SyncOptionsService(
  'mountConfig',
  defaultMountConfig
)
  .version(1, {
    upgrade: (data: PrevOptions) => data,
  })
  .version(2, {
    upgrade: (data: PrevOptions) =>
      data.map((config: PrevOptions) => ({
        ...config,
        enabled: false, // switching to new permission model. disable all configs by default, permission will be asked when enabled
      })),
  })

export const upgradeOptions = async () => {
  await Promise.all([
    extensionOptionsService.upgrade(),
    danmakuOptionsService.upgrade(),
    mountConfigService.upgrade(),
  ])
}
